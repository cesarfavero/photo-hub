import { NextRequest } from "next/server";
import { detectFacesFromUrl, ensureFaceModels } from "@/lib/face-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    note: "Use POST { url } for a one-off detect, or /api/analysis/process for the pipeline",
  });
}

export async function POST(request: NextRequest) {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!url || !/^https:\/\//.test(url)) {
    return Response.json(
      { ok: false, error: "url https obrigatoria" },
      { status: 400 },
    );
  }

  await ensureFaceModels();
  const startedAt = Date.now();
  const faces = await detectFacesFromUrl(url);
  const elapsedMs = Date.now() - startedAt;

  return Response.json({
    ok: true,
    faces: faces.length,
    elapsedMs,
    results: faces.map((d) => ({
      score: d.confidence,
      box: d.box,
      descriptor: d.embedding,
    })),
  });
}
