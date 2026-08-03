"use client";

import { useCallback, useEffect, useState } from "react";
import { CameraOffIcon, RefreshCwIcon, UserRoundIcon } from "lucide-react";
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
  const [selected, setSelected] = useState<Photo | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("photos")
      .select("*")
      .eq("event_id", eventId)
      .eq("approved", true)
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

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          <RefreshCwIcon /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <CameraOffIcon className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma foto ainda. Seja a primeira pessoa a tirar uma!
          </p>
        </div>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelected(photo)}
              className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5 transition-shadow duration-200 hover:shadow-md"
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
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected ? (
          <DialogContent className="max-w-md overflow-hidden p-0 sm:max-w-lg">
            <DialogTitle className="sr-only">
              {selected.author_name ?? "Foto do evento"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Foto publicada na galeria
            </DialogDescription>
            <div className="max-h-[80vh] overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.public_url}
                alt={selected.author_name ?? "Foto do evento"}
                className="h-auto w-full object-contain"
              />
            </div>
            {selected.author_name ? (
              <div className="flex items-center gap-2 px-4 pb-4 text-sm font-medium">
                <UserRoundIcon className="size-4" />
                {selected.author_name}
              </div>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
