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

async function normalizeImageToPng(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("encode")),
          "image/png",
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
      toast.error("Arquivo inválido", {
        description: "Envie uma imagem com o centro transparente.",
      });
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const frameId =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${eventId}/${frameId}.png`;

    let payload: Blob = file;
    try {
      payload = await normalizeImageToPng(file);
    } catch {
      toast.error("Imagem não pôde ser processada", {
        description:
          "Tente com um PNG ou JPG e verifique se o arquivo não está corrompido.",
      });
      setUploading(false);
      return;
    }

    const { error: upError } = await supabase.storage
      .from("frames")
      .upload(path, payload, { contentType: "image/png" });
    if (upError) {
      toast.error("Falha no envio", {
        description: "Não conseguimos enviar a moldura. Tente novamente.",
      });
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
      toast.error("Não foi possível salvar", {
        description: "Tente novamente em alguns instantes.",
      });
      return;
    }
    toast.success("Moldura adicionada!", {
      description: "Ela já aparece para os convidados.",
    });
    setName("");
    router.refresh();
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("frames").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir", {
        description: "Tente novamente em alguns instantes.",
      });
      return;
    }
    toast.success("Moldura excluída");
    router.refresh();
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Molduras</h3>
          <p className="text-xs text-muted-foreground">
            PNG com o centro transparente (qualquer proporção).
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
                className="h-full w-full object-contain"
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
