"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, EyeOffIcon, Trash2Icon } from "lucide-react";
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

type Filter = "all" | "approved" | "pending";

export function PhotoManager({ photos }: { photos: Photo[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "approved") return photos.filter((p) => p.approved);
    if (filter === "pending") return photos.filter((p) => !p.approved);
    return photos;
  }, [photos, filter]);

  const toggleApproval = async (photo: Photo) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("photos")
      .update({ approved: !photo.approved })
      .eq("id", photo.id);
    if (error) {
      toast.error("Erro ao atualizar.");
      return;
    }
    toast.success(photo.approved ? "Foto desaprovada." : "Foto aprovada!");
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
      toast.error("Erro ao excluir a foto.");
      return;
    }
    toast.success("Foto excluída.");
    router.refresh();
  };

  const pendingCount = photos.filter((p) => !p.approved).length;

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
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-5 text-[10px] font-medium text-white">
                <span className="truncate">
                  {photo.author_name ?? "Anônimo"}
                </span>
                {!photo.approved ? (
                  <Badge className="shrink-0 bg-amber-500 text-[9px] text-white">
                    Pendente
                  </Badge>
                ) : null}
              </div>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
