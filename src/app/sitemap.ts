import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

const siteUrl = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("slug, created_at")
    .eq("active", true);

  const eventEntries: MetadataRoute.Sitemap = (events ?? []).map((event) => ({
    url: `${siteUrl}/${event.slug}`,
    lastModified: new Date(event.created_at),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...eventEntries,
  ];
}
