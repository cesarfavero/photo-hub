"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CameraOffIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ImagesIcon,
  RefreshCwIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function Gallery({ eventId }: { eventId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("photos")
      .select("*")
      .eq("event_id", eventId)
      .eq("approved", true)
      .eq("archived", false)
      .order("created_at", { ascending: false });
    setPhotos(data ?? []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase
        .from("photos")
        .select("*")
        .eq("event_id", eventId)
        .eq("approved", true)
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (active) {
        setPhotos(data ?? []);
        setLoading(false);
      }
    })();
    const channel = supabase
      .channel(`photos:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: `event_id=eq.${eventId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [eventId, load]);

  const selected = index !== null ? photos[index] : null;

  const goPrev = useCallback(() => {
    setIndex((i) => (i === null ? i : (i + photos.length - 1) % photos.length));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i === null ? i : (i + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goPrev, goNext]);

  return (
    <div className="px-4 pb-24 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImagesIcon className="size-4" />
          <span>{loading ? "Carregando…" : `${photos.length} ${photos.length === 1 ? "foto" : "fotos"}`}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
        >
          <RefreshCwIcon className={loading ? "animate-spin" : ""} /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="mx-auto max-w-5xl rounded-2xl border border-dashed p-12 text-center">
          <CameraOffIcon className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma foto ainda. Seja a primeira pessoa a tirar uma!
          </p>
        </div>
      ) : (
        <div className="mx-auto columns-2 gap-2 sm:max-w-5xl sm:columns-3 sm:gap-3 lg:columns-4">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setIndex(i)}
              className="group relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5 transition-shadow duration-200 hover:shadow-md sm:mb-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.public_url}
                alt={photo.author_name ?? "Foto do evento"}
                loading="lazy"
                className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {photo.author_name ? (
                <span className="absolute inset-x-2 bottom-2 flex w-fit items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                  <UserRoundIcon className="size-3 text-muted-foreground" />
                  {photo.author_name}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={index !== null}
        onOpenChange={(open) => {
          if (!open) setIndex(null);
        }}
      >
        {selected ? (
          <DialogContent
            showCloseButton={false}
            className="h-dvh max-w-none overflow-hidden rounded-none border-0 bg-black p-0 ring-0 sm:h-auto sm:max-w-2xl sm:rounded-xl"
          >
            <DialogTitle className="sr-only">
              {selected.author_name ?? "Foto do evento"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Foto publicada na galeria
            </DialogDescription>

            <button
              type="button"
              onClick={() => setIndex(null)}
              aria-label="Fechar"
              className="absolute right-4 top-4 z-20 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95"
            >
              <XIcon className="size-5" />
            </button>

            <div className="relative flex h-full items-center justify-center bg-black">
              <div className="flex max-h-full w-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.public_url}
                  alt={selected.author_name ?? "Foto do evento"}
                  className="max-h-dvh w-full object-contain sm:max-h-[80vh]"
                />
              </div>

              <button
                type="button"
                onClick={goPrev}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95 sm:left-4"
              >
                <ChevronLeftIcon className="size-6" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Próxima foto"
                className="absolute right-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95 sm:right-4"
              >
                <ChevronRightIcon className="size-6" />
              </button>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-5 pb-5 pt-10">
              <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                {selected.author_name ? (
                  <>
                    <UserRoundIcon className="size-4" />
                    {selected.author_name}
                  </>
                ) : (
                  "Foto do evento"
                )}
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                {index !== null ? index + 1 : ""} / {photos.length}
              </span>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
