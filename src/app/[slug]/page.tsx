import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRightIcon, ImagesIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { themeVars } from "@/lib/theme";
import { PhotoBooth } from "@/components/photo-booth";
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
    <main
      style={themeVars(event.theme_color)}
      className="bg-glow flex min-h-dvh flex-col"
    >
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <EventHeader event={event} />
        <PhotoBooth event={event} frames={frames ?? []} />

        <div className="mt-14">
          <Link
            href={`/${event.slug}/galeria`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-card/60 px-5 py-4 transition-colors duration-200 hover:border-foreground/20 hover:bg-card sm:px-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground/70 transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <ImagesIcon className="size-5" />
              </div>
              <div>
                <p className="font-medium">Galeria do evento</p>
                <p className="text-sm text-muted-foreground">
                  Veja todas as fotos publicadas ao vivo.
                </p>
              </div>
            </div>
            <ArrowRightIcon className="size-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
          </Link>
        </div>
      </div>
    </main>
  );
}
