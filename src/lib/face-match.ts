/** Euclidean distance between two face-api descriptors (128-d). */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** face-api typical match threshold (lower = stricter). */
export const FACE_MATCH_THRESHOLD = 0.55;

export type FaceAnchor = {
  cluster_id: string;
  participant_profile_id: string | null;
  embedding: number[];
};

export type FaceMatchResult = {
  cluster_id: string | null;
  participant_profile_id: string | null;
  distance: number;
};

export function matchFaceToAnchors(
  embedding: number[],
  anchors: FaceAnchor[],
  threshold = FACE_MATCH_THRESHOLD,
): FaceMatchResult {
  let best: FaceMatchResult = {
    cluster_id: null,
    participant_profile_id: null,
    distance: Number.POSITIVE_INFINITY,
  };

  for (const anchor of anchors) {
    if (!anchor.embedding?.length) continue;
    const dist = euclideanDistance(embedding, anchor.embedding);
    if (dist < best.distance) {
      best = {
        cluster_id: anchor.cluster_id,
        participant_profile_id: anchor.participant_profile_id,
        distance: dist,
      };
    }
  }

  if (best.distance > threshold) {
    return {
      cluster_id: null,
      participant_profile_id: null,
      distance: best.distance,
    };
  }

  return best;
}
