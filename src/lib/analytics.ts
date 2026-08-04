export type HasCreatedAt = { created_at: string };
export type HasEventId = { event_id: string };
export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const daysAgo = (n: number) => addDays(startOfDay(new Date()), -n);

export function createdWithin(items: HasCreatedAt[], days: number) {
  const cutoff = daysAgo(days);
  return items.filter((i) => new Date(i.created_at) >= cutoff).length;
}

export function photosPerDay(
  photos: HasCreatedAt[],
  days: number,
): { date: Date; count: number }[] {
  const today = startOfDay(new Date());
  const byDate = new Map<string, number>();
  for (const photo of photos) {
    const d = startOfDay(new Date(photo.created_at));
    byDate.set(d.toDateString(), (byDate.get(d.toDateString()) ?? 0) + 1);
  }
  const result: { date: Date; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    result.push({ date: d, count: byDate.get(d.toDateString()) ?? 0 });
  }
  return result;
}

export function sumRecent(photos: HasCreatedAt[], days: number) {
  const cutoff = daysAgo(days);
  return photos.filter((p) => new Date(p.created_at) >= cutoff).length;
}

export function countBefore(photos: HasCreatedAt[], days: number) {
  const cutoff = Date.now() - days * 864e5;
  return photos.filter((p) => new Date(p.created_at).getTime() < cutoff).length;
}

export function pctGrowth(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function hourlyDistribution(
  photos: HasCreatedAt[],
): { hour: number; count: number }[] {
  const buckets = new Array(24).fill(0) as number[];
  for (const photo of photos) {
    const h = new Date(photo.created_at).getHours();
    buckets[h] += 1;
  }
  return buckets.map((count, hour) => ({ hour, count }));
}

export function weekdayDistribution(
  photos: HasCreatedAt[],
): { weekday: number; count: number }[] {
  const buckets = new Array(7).fill(0) as number[];
  for (const photo of photos) {
    const w = new Date(photo.created_at).getDay();
    buckets[w] += 1;
  }
  return buckets.map((count, weekday) => ({ weekday, count }));
}

export const WEEKDAY_LABELS = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
];

export function topEvents<T extends { id: string }>(
  events: T[],
  photos: HasEventId[],
  n = 5,
) {
  const byEvent = new Map<string, number>();
  for (const photo of photos) {
    byEvent.set(photo.event_id, (byEvent.get(photo.event_id) ?? 0) + 1);
  }
  return [...events]
    .map((event) => ({
      event,
      photos: byEvent.get(event.id) ?? 0,
    }))
    .sort((a, b) => b.photos - a.photos)
    .slice(0, n);
}

export function bestHour(hours: { hour: number; count: number }[]) {
  return hours.reduce((best, h) => (h.count > best.count ? h : best), {
    hour: 0,
    count: 0,
  });
}

export function bestDay(days: { date: Date; count: number }[]) {
  return days.reduce(
    (best, d) => (d.count > best.count ? d : best),
    { date: new Date(), count: 0 },
  );
}

export function average(list: number[]) {
  if (list.length === 0) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}
