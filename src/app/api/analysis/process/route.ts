import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  detectFacesFromUrl,
  getAnalysisVersion,
} from "@/lib/face-analysis";
import {
  matchFaceToAnchors,
  type FaceAnchor,
} from "@/lib/face-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorize(request: NextRequest): { ok: boolean; privileged: boolean } {
  const secret = process.env.ANALYSIS_CRON_SECRET;
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const query = request.nextUrl.searchParams.get("secret");
  const privileged = Boolean(secret && (bearer === secret || query === secret));

  if (privileged) return { ok: true, privileged: true };
  // Public fire-and-forget after upload: allowed with service role present.
  // Without cron secret, all callers are "public" (limited batch).
  if (!secret && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, privileged: false };
  }
  // With secret configured, still allow public small batches (event scoped preferred)
  if (secret && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, privileged: false };
  }
  return { ok: false, privileged: false };
}

type AnchorRow = {
  cluster_id: string;
  participant_profile_id: string | null;
  embedding: number[] | string;
};

function parseEmbedding(raw: number[] | string): number[] {
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as number[];
      if (Array.isArray(parsed)) return parsed.map(Number);
    } catch {
      /* ignore */
    }
  }
  return [];
}

async function loadAnchors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  eventId: string,
): Promise<FaceAnchor[]> {
  const { data, error } = await admin.rpc("get_event_face_anchors", {
    p_event_id: eventId,
  });
  if (error) {
    console.error("get_event_face_anchors", error);
    return [];
  }
  return ((data ?? []) as AnchorRow[])
    .map((row) => ({
      cluster_id: row.cluster_id,
      participant_profile_id: row.participant_profile_id,
      embedding: parseEmbedding(row.embedding),
    }))
    .filter((a) => a.embedding.length > 0);
}

export async function GET(request: NextRequest) {
  const auth = authorize(request);
  if (!auth.ok) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const eventId = request.nextUrl.searchParams.get("eventId");
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "3") || 3;
  const limit = auth.privileged
    ? Math.min(20, Math.max(1, rawLimit))
    : Math.min(3, Math.max(1, rawLimit));

  try {
    const admin = createAdminClient();
    const { data: photos, error } = await admin.rpc("claim_pending_photos", {
      p_event_id: eventId,
      p_limit: limit,
    });

    if (error) {
      return Response.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const batch = (photos ?? []) as {
      id: string;
      event_id: string;
      public_url: string;
    }[];

    const results: {
      photoId: string;
      faces: number;
      status: string;
      error?: string;
    }[] = [];

    // Cache anchors per event within this request
    const anchorsByEvent = new Map<string, FaceAnchor[]>();

    for (const photo of batch) {
      try {
        let anchors = anchorsByEvent.get(photo.event_id);
        if (!anchors) {
          anchors = await loadAnchors(admin, photo.event_id);
          anchorsByEvent.set(photo.event_id, anchors);
        }

        const detections = await detectFacesFromUrl(photo.public_url);
        const facesPayload = detections.map((d) => {
          const match = matchFaceToAnchors(d.embedding, anchors!);
          // When matching a linked profile, keep cluster; when new, leave null
          // so SQL creates a cluster. When match hits an existing cluster, reuse.
          if (match.cluster_id) {
            // Update local anchors so subsequent faces in same photo can match
            // only if we create new - handled after insert for cross-photo only
            return {
              face_index: d.face_index,
              confidence: d.confidence,
              embedding: d.embedding,
              cluster_id: match.cluster_id,
              participant_profile_id: match.participant_profile_id,
              source: match.participant_profile_id
                ? "automatic_face_match"
                : "automatic_cluster_match",
            };
          }
          return {
            face_index: d.face_index,
            confidence: d.confidence,
            embedding: d.embedding,
            source: "automatic_face_match",
          };
        });

        // Also try to link new faces to each other within the photo by updating
        // anchors after each unmatched face is "virtually" added
        const enriched: typeof facesPayload = [];
        const localAnchors = [...anchors];
        for (const face of facesPayload) {
          if (face.cluster_id) {
            enriched.push(face);
            continue;
          }
          const rematch = matchFaceToAnchors(face.embedding, localAnchors);
          if (rematch.cluster_id) {
            enriched.push({
              ...face,
              cluster_id: rematch.cluster_id,
              participant_profile_id: rematch.participant_profile_id,
              source: rematch.participant_profile_id
                ? "automatic_face_match"
                : "automatic_cluster_match",
            });
          } else {
            // Placeholder cluster id will be created in SQL; for local matching
            // within remaining faces we need a synthetic anchor after save.
            enriched.push(face);
            // Add embedding as temporary anchor without cluster (won't help until saved)
            // Skip - cross-face same photo rare enough for MVP
          }
        }

        const { error: saveError } = await admin.rpc("save_face_detections", {
          p_photo_id: photo.id,
          p_faces: enriched,
        });
        if (saveError) throw new Error(saveError.message);

        await admin.rpc("mark_photo_analyzed", {
          p_photo_id: photo.id,
          p_status: "done",
          p_version: getAnalysisVersion(),
        });

        // Refresh anchors for this event after successful save
        anchorsByEvent.set(
          photo.event_id,
          await loadAnchors(admin, photo.event_id),
        );

        results.push({
          photoId: photo.id,
          faces: enriched.length,
          status: "done",
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "unknown";
        console.error("analysis failed", photo.id, message);
        await admin.rpc("mark_photo_analyzed", {
          p_photo_id: photo.id,
          p_status: "failed",
          p_version: getAnalysisVersion(),
        });
        results.push({
          photoId: photo.id,
          faces: 0,
          status: "failed",
          error: message,
        });
      }
    }

    return Response.json({
      ok: true,
      processed: results.length,
      version: getAnalysisVersion(),
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Same as GET but accepts JSON body { eventId?, limit? }
  const auth = authorize(request);
  if (!auth.ok) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    eventId?: string;
    limit?: number;
  };
  const url = request.nextUrl.clone();
  if (body.eventId) url.searchParams.set("eventId", body.eventId);
  if (body.limit) url.searchParams.set("limit", String(body.limit));
  return GET(new NextRequest(url, { headers: request.headers }));
}
