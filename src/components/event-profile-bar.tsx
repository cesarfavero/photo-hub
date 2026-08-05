"use client";

import { useState } from "react";
import Link from "next/link";
import { CameraIcon, ImagesIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileCreator } from "@/components/profile-creator";
import { useEventProfile } from "@/hooks/use-event-profile";
import type { Event } from "@/lib/types";

export function EventProfileBar({ event }: { event: Event }) {
  const { state, refresh } = useEventProfile(event.id);
  const [showCreator, setShowCreator] = useState(false);

  if (state.status === "loading") {
    return <div className="mb-4 h-12 animate-pulse rounded-xl bg-muted" />;
  }

  if (state.status === "found") {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-card/60 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {state.profile.reference_photo_url ? (
            <div className="size-9 shrink-0 overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.profile.reference_photo_url}
                alt={state.profile.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRoundIcon className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              Você está navegando como: {state.profile.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Suas fotos aparecem na galeria por pessoa
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/${event.slug}/galeria`} />}
          className="shrink-0"
        >
          <ImagesIcon /> Minhas fotos
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CameraIcon className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Crie seu perfil e encontre suas fotos
              </p>
              <p className="text-xs text-muted-foreground">
                Tire uma selfie e informe seu nome. Este celular fica vinculado
                a você neste evento.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreator(true)} className="shrink-0">
            Criar perfil
          </Button>
        </div>
      </div>

      <Dialog open={showCreator} onOpenChange={setShowCreator}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar seu perfil</DialogTitle>
            <DialogDescription>
              Tire uma foto e informe seu nome. Usaremos para encontrar outras
              fotos suas.
            </DialogDescription>
          </DialogHeader>
          <ProfileCreator
            event={event}
            onCreated={() => {
              setShowCreator(false);
              void refresh();
            }}
            onCancel={() => setShowCreator(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
