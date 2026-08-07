import { getSiteUrl } from "@/lib/site-url";

/**
 * Fire-and-forget call to the face analysis worker.
 * Safe to call from the browser after upload (no secret required when
 * ANALYSIS_CRON_SECRET is unset and service role exists on server).
 * Prefer server-side trigger with secret in production.
 */
export function triggerAnalysis(eventId?: string) {
  const params = new URLSearchParams();
  if (eventId) params.set("eventId", eventId);
  params.set("limit", "3");

  const secret = process.env.NEXT_PUBLIC_ANALYSIS_TRIGGER_SECRET;
  // Client cannot use server secret; public optional trigger or open in dev
  const qs = params.toString();
  const url = `/api/analysis/process?${qs}`;

  void fetch(url, {
    method: "GET",
    headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
    keepalive: true,
  }).catch(() => {
    /* ignore network errors */
  });
}

/** Server-side trigger with cron secret. */
export async function triggerAnalysisServer(eventId?: string, limit = 5) {
  const base = getSiteUrl();

  const params = new URLSearchParams();
  if (eventId) params.set("eventId", eventId);
  params.set("limit", String(limit));

  const secret = process.env.CRON_SECRET || process.env.ANALYSIS_CRON_SECRET;
  const headers: HeadersInit = {};
  if (secret) headers.Authorization = `Bearer ${secret}`;

  try {
    await fetch(`${base}/api/analysis/process?${params}`, {
      method: "GET",
      headers,
    });
  } catch {
    /* ignore */
  }
}
