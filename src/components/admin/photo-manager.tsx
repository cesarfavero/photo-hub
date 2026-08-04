"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CheckIcon,
  EyeOffIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/lib/types";

type Filter = "all" | "approved" | "pending" | "archived";

export function PhotoManager({ photos }: { photos: Photo[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "approved") return photos.filter((p) => p.approved && !p.archived);
    if (filter === "pending") return photos.filter((p) => !p.approved);
    if (filter === "archived") return photos.filter((p) => p.archived);
    return photos;
  }, [photos, filter]);

  const toggleApproval = async (photo: Photo) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("photos")
      .update({ approved: !photo.approved })
      .eq("id", photo.id);
    if (error) {
      toast.error("Não foi possível atualizar", {
        description: "Tente novamente em alguns instantes.",
      });
      return;
    }
    toast.success(
      photo.approved ? "Foto ocultada" : "Foto aprovada!",
      photo.approved
        ? { description: "Ela foi removida da galeria pública." }
        : { description: "Ela já aparece na galeria para todos." },
    );
    router.refresh();
  };

  const toggleArchive = async (photo: Photo) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("photos")
      .update({ archived: !photo.archived })
      .eq("id", photo.id);
    if (error) {
      toast.error("Não foi possível arquivar", {
        description: "Tente novamente em alguns instantes.",
      });
      return;
    }
    toast.success(
      photo.archived ? "Foto restaurada" : "Foto arquivada",
      photo.archived
        ? { description: "Ela voltou a aparecer na galeria." }
        : { description: "Ela foi arquivada e sai da galeria pública." },
    );
    router.refresh();
  };

  const remove = async (photo: Photo) => {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("photos")
      .remove([photo.storage_path]);
    const { error: dbError } = await supabase
      .from("photos")
      .delete()
      .eq("id", photo.id);
    if (error || dbError) {
      toast.error("Não foi possível excluir", {
        description: "Tente novamente em alguns instantes.",
      });
      return;
    }
    toast.success("Foto excluída");
    router.refresh();
  };

  const pendingCount = photos.filter((p) => !p.approved).length;
  const archivedCount = photos.filter((p) => p.archived).length;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Fotos da galeria</h3>
          <p className="text-xs text-muted-foreground">
            {photos.length} {photos.length === 1 ? "foto" : "fotos"} no total
            {pendingCount > 0
              ? ` · ${pendingCount} pendente${pendingCount === 1 ? "" : "s"}`
              : ""}
            {archivedCount > 0
              ? ` · ${archivedCount} arquivada${archivedCount === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          className="w-fit"
        >
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="approved">Aprovadas</TabsTrigger>
            <TabsTrigger value="pending">
              Pendentes
              {pendingCount > 0 ? ` (${pendingCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="archived">
              Arquivadas
              {archivedCount > 0 ? ` (${archivedCount})` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma foto aqui.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.public_url}
                alt={photo.author_name ?? "Foto"}
                className={photo.archived ? "h-full w-full object-cover opacity-40 grayscale" : "h-full w-full object-cover"}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-5 text-[10px] font-medium text-white">
                <span className="truncate">
                  {photo.author_name ?? "Anônimo"}
                </span>
                {!photo.approved ? (
                  <Badge className="shrink-0 bg-amber-500 text-[9px] text-white">
                    Pendente
                  </Badge>
                ) : photo.archived ? (
                  <Badge className="shrink-0 bg-zinc-600 text-[9px] text-white">
                    Arquivada
                  </Badge>
                ) : null}
              </div>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button
                  size="icon-sm"
                  variant={photo.approved ? "secondary" : "default"}
                  className="size-7"
                  onClick={() => void toggleApproval(photo)}
                  aria-label={
                    photo.approved ? "Desaprovar foto" : "Aprovar foto"
                  }
                >
                  {photo.approved ? <EyeOffIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
                </Button>
                <Button
                  size="icon-sm"
                  variant="secondary"
                  className="size-7"
                  onClick={() => void toggleArchive(photo)}
                  aria-label={
                    photo.archived ? "Restaurar foto" : "Arquivar foto"
                  }
                >
                  {photo.archived ? (
                    <ArchiveRestoreIcon className="size-3.5" />
                  ) : (
                    <ArchiveIcon className="size-3.5" />
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-md bg-black/50 text-white"
                        aria-label="Excluir foto"
                      />
                    }
                  >
                    <Trash2Icon className="size-3.5" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Essa foto será removida da galeria.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void remove(photo)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
