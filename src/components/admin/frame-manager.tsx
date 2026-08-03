"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlusIcon,
  LoaderCircleIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Frame } from "@/lib/types";

export function FrameManager({
  eventId,
  frames,
}: {
  eventId: string;
  frames: Frame[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("O arquivo precisa ser uma imagem.");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const frameId = crypto.randomUUID();
    const path = `${eventId}/${frameId}.png`;

    const { error: upError } = await supabase.storage
      .from("frames")
      .upload(path, file, { contentType: file.type });
    if (upError) {
      toast.error("Erro ao enviar a moldura.");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("frames")
      .getPublicUrl(path);

    const { error: insertError } = await supabase.from("frames").insert({
      event_id: eventId,
      name: name.trim() || "Moldura",
      image_url: urlData.publicUrl,
      sort_order: frames.length,
    });
    setUploading(false);
    if (insertError) {
      toast.error("Erro ao salvar a moldura.");
      return;
    }
    toast.success("Moldura adicionada!");
    setName("");
    router.refresh();
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("frames").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir a moldura.");
      return;
    }
    toast.success("Moldura excluída.");
    router.refresh();
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Molduras</h3>
          <p className="text-xs text-muted-foreground">
            Use imagens PNG 3:4 com o centro transparente.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <UploadIcon />
          )}
          Adicionar moldura
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mb-4">
        <Label htmlFor="frame-name" className="text-xs">
          Nome da moldura (aparece para o convidado)
        </Label>
        <Input
          id="frame-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Aniversário"
          className="mt-1 h-10 max-w-sm"
        />
      </div>

      {frames.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <ImagePlusIcon className="mx-auto mb-2 size-6" />
          Nenhuma moldura ainda. Envie um PNG para começar.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {frames.map((frame) => (
            <div
              key={frame.id}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frame.image_url}
                alt={frame.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] font-medium text-white">
                {frame.name}
              </div>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <button
                      type="button"
                      className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  }
                >
                  <Trash2Icon className="size-3.5" />
                  <span className="sr-only">Excluir moldura</span>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir moldura?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A moldura será removida do evento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void remove(frame.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
