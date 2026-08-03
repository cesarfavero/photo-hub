"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CopyIcon,
  ExternalLinkIcon,
  ImagesIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QrCode } from "@/components/admin/qr-code";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/types";

type EventStats = {
  total: number;
  approved: number;
};

export function EventCard({
  event,
  stats,
  origin,
}: {
  event: Event;
  stats: EventStats;
  origin: string;
}) {
  const router = useRouter();
  const eventUrl = `${origin}/${event.slug}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(eventUrl);
    toast.success("Link copiado!");
  };

  const toggleActive = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ active: !event.active })
      .eq("id", event.id);
    if (error) {
      toast.error("Erro ao atualizar.");
      return;
    }
    router.refresh();
  };

  const remove = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) {
      toast.error("Erro ao excluir.");
      return;
    }
    toast.success("Evento excluído.");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">{event.name}</h2>
            <p className="text-xs text-muted-foreground">
              /{event.slug} ·{" "}
              {new Date(event.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
          {!event.active ? (
            <Badge variant="secondary">Desativado</Badge>
          ) : null}
        </div>

        {event.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {event.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <ImagesIcon className="size-3" />
            {stats.total} {stats.total === 1 ? "foto" : "fotos"}
          </Badge>
          {stats.approved < stats.total ? (
            <Badge variant="outline">
              {stats.total - stats.approved} pendente
              {(stats.total - stats.approved) === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={copyLink}>
            <CopyIcon /> Copiar link
          </Button>
          <Button variant="outline" size="sm" render={<Link href={eventUrl} target="_blank" />}>
            <ExternalLinkIcon /> Abrir
          </Button>
          <Button variant="outline" size="sm" onClick={toggleActive}>
            {event.active ? "Desativar" : "Ativar"}
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/admin/events/${event.id}`} />}>
            <Settings2Icon /> Gerenciar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="ghost" size="icon" className="text-destructive" />
              }
            >
              <Trash2Icon />
              <span className="sr-only">Excluir evento</span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                <AlertDialogDescription>
                  As molduras e fotos deste evento serão apagadas
                  permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center gap-4 self-center sm:self-start">
        <QrCode url={eventUrl} size={140} />
      </div>
    </div>
  );
}
