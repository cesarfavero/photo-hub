import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PhotoBooth } from "@/components/photo-booth";
import { Gallery } from "@/components/gallery";
import { EventHeader } from "@/components/event-header";

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
    title: event ? `${event.name} · Photo Hub` : "Evento · Photo Hub",
  };
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single();

  const { data: frames } = await supabase
    .from("frames")
    .select("*")
    .eq("event_id", event?.id ?? "")
    .order("sort_order", { ascending: true });

  if (!event || !event.active) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <EventHeader event={event} />
      <PhotoBooth event={event} frames={frames ?? []} />
      <div id="galeria" className="mt-10 scroll-mt-6">
        <h2 className="text-lg font-semibold">Galeria</h2>
        <p className="text-sm text-muted-foreground">
          Todas as fotos tiradas no evento.
        </p>
        <Gallery eventId={event.id} />
      </div>
    </main>
  );
}
