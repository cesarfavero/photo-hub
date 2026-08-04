"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BanIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type EventSummary = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  photos: number;
};

export function ClientRow({
  client,
  events,
}: {
  client: Profile;
  events: EventSummary[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggleBlock = async () => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ active: !client.active })
      .eq("id", client.id);
    setLoading(false);
    if (error) {
      toast.error("Não foi possível atualizar", {
        description: "Tente novamente em alguns instantes.",
      });
      return;
    }
    toast.success(
      client.active
        ? "Cliente bloqueado"
        : "Cliente desbloqueado",
    );
    router.refresh();
  };

  const totalPhotos = events.reduce((sum, e) => sum + e.photos, 0);

  return (
    <div
      className={`rounded-2xl border bg-card p-5 shadow-sm ${
        client.active ? "" : "opacity-75"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground/70">
            <UsersIcon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{client.email}</p>
            <p className="text-xs text-muted-foreground">
              Cliente desde{" "}
              {new Date(client.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {client.is_admin ? (
            <Badge className="gap-1">
              <ShieldCheckIcon className="size-3" />
              Admin
            </Badge>
          ) : client.active ? (
            <Badge className="gap-1 bg-emerald-600">
              <CheckCircle2Icon className="size-3" />
              Ativo
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <BanIcon className="size-3" />
              Bloqueado
            </Badge>
          )}
          {!client.is_admin ? (
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void toggleBlock()}
            >
              {loading ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : null}
              {client.active ? "Bloquear" : "Desbloquear"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarIcon className="size-3.5" />
          {events.length} {events.length === 1 ? "evento" : "eventos"}
        </span>
        <span className="flex items-center gap-1.5">
          <CameraIcon className="size-3.5" />
          {totalPhotos} {totalPhotos === 1 ? "foto" : "fotos"}
        </span>
      </div>

      {events.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/60 px-4 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{event.name}</p>
                <p className="text-xs text-muted-foreground">
                  /{event.slug} · {event.photos}{" "}
                  {event.photos === 1 ? "foto" : "fotos"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!event.active ? (
                  <Badge variant="secondary">Desativado</Badge>
                ) : null}
                <Link
                  href={`/${event.slug}`}
                  target="_blank"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Abrir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum evento ainda.</p>
      )}
    </div>
  );
}
