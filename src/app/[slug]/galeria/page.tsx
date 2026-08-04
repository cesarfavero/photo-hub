import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { themeVars } from "@/lib/theme";
import { Gallery } from "@/components/gallery";
import { GalleryHeader } from "@/components/gallery-header";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("name")
    .eq("slug", slug)
    .single();

  return {
    title: event ? `Galeria · ${event.name}` : "Galeria · Photo Hub",
  };
}

export default async function GalleryPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!event || !event.active) {
    notFound();
  }

  return (
    <main
      style={themeVars(event.theme_color)}
      className="bg-glow flex min-h-dvh flex-col"
    >
      <GalleryHeader event={event} />
      <div className="mx-auto w-full flex-1 px-0 sm:px-6">
        <Gallery eventId={event.id} />
      </div>
    </main>
  );
}
