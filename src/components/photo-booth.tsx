"use client";

import { useEffect, useRef, useState } from "react";
import {
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  FlipHorizontalIcon,
  ImageIcon,
  PartyPopperIcon,
  RefreshCwIcon,
  UploadIcon,
  UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  PHOTO_HEIGHT,
  PHOTO_WIDTH,
  type Event,
  type Frame,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "frame" | "camera" | "captured" | "success";

type FacingMode = "user" | "environment";

function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  mirror = false,
) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const dW = srcW * scale;
  const dH = srcH * scale;
  const dX = (dstW - dW) / 2;
  const dY = (dstH - dH) / 2;
  ctx.save();
  if (mirror) {
    ctx.translate(dstW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, dX, dY, dW, dH);
  ctx.restore();
}

export function PhotoBooth({
  event,
  frames,
}: {
  event: Event;
  frames: Frame[];
}) {
  const [step, setStep] = useState<Step>("frame");
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(
    frames[0]?.id ?? null,
  );
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingRef = useRef<FacingMode>("user");

  const selectedFrame = frames.find((f) => f.id === selectedFrameId) ?? null;

  useEffect(() => {
    let active = true;
    const cleanup = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      active = false;
    };

    if (step !== "camera") return cleanup;

    facingRef.current = facingMode;
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("unsupported");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingRef.current,
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (active) setCameraError(null);
      } catch {
        if (active) {
          setCameraError(
            "Não conseguimos acessar a câmera. Verifique a permissão de câmera no navegador.",
          );
        }
      }
    })();

    return cleanup;
  }, [step, facingMode]);

  const switchCamera = () => {
    setFacingMode((prev) =>
      prev === "user" ? "environment" : "user",
    );
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_WIDTH;
    canvas.height = PHOTO_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawCover(
      ctx,
      video,
      video.videoWidth,
      video.videoHeight,
      PHOTO_WIDTH,
      PHOTO_HEIGHT,
      facingMode === "user",
    );

    if (selectedFrame) {
      const img = new Image();
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = selectedFrame.image_url;
        });
        drawCover(ctx, img, img.width, img.height, PHOTO_WIDTH, PHOTO_HEIGHT);
      } catch {
        toast.error("Erro ao carregar a moldura. Tente novamente.");
        return;
      }
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) return;

    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(URL.createObjectURL(blob));
    setStep("captured");
  };

  const upload = async () => {
    if (!capturedUrl) return;
    setUploading(true);
    const supabase = createClient();

    const blob = await fetch(capturedUrl).then((r) => r.blob());
    const photoId = crypto.randomUUID();
    const path = `${event.id}/${photoId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (uploadError) {
      toast.error("Erro ao enviar a foto. Tente novamente.");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("photos")
      .getPublicUrl(path);

    const { error: insertError } = await supabase.from("photos").insert({
      event_id: event.id,
      frame_id: selectedFrameId,
      storage_path: path,
      public_url: urlData.publicUrl,
      author_name: authorName.trim() || null,
    });
    if (insertError) {
      toast.error("Erro ao publicar a foto. Tente novamente.");
      setUploading(false);
      return;
    }

    setUploading(false);
    setStep("success");
  };

  const reset = () => {
    setCapturedUrl(null);
    setAuthorName("");
    setStep("frame");
  };

  const scrollToGallery = () => {
    document
      .getElementById("galeria")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="cabine"
      className="rounded-2xl border bg-card shadow-sm"
    >
      <div className="p-4 sm:p-6">
        {step === "frame" && (
          <FramePicker
            frames={frames}
            selectedFrameId={selectedFrameId}
            onSelect={setSelectedFrameId}
            onContinue={() => setStep("camera")}
          />
        )}

        {step === "camera" && (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[380px] overflow-hidden rounded-xl bg-black aspect-[3/4]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "absolute inset-0 h-full w-full object-cover",
                  facingMode === "user" && "-scale-x-100",
                )}
              />
              {selectedFrame ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedFrame.image_url}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black p-6 text-center text-sm text-white">
                  {cameraError}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex w-full max-w-[380px] items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setStep("frame")}
                aria-label="Voltar"
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                size="icon"
                className="size-16 rounded-full shadow-lg"
                onClick={capture}
                aria-label="Tirar foto"
                disabled={!!cameraError}
              >
                <CameraIcon className="size-8" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={switchCamera}
                aria-label="Trocar câmera"
              >
                <FlipHorizontalIcon />
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Toque para tirar a foto. A moldura aparece sobre a câmera.
            </p>
          </div>
        )}

        {step === "captured" && capturedUrl && (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[380px] overflow-hidden rounded-xl bg-black aspect-[3/4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedUrl}
                alt="Foto capturada"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-5 w-full max-w-[380px] space-y-4">
              <div className="space-y-2">
                <Label htmlFor="author-name" className="flex items-center gap-2">
                  <UserRoundIcon className="size-4" /> Seu nome (opcional)
                </Label>
                <Input
                  id="author-name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Ex.: Maria Souza"
                  maxLength={60}
                  className="h-11 text-base"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex-1"
                  disabled={uploading}
                >
                  <RefreshCwIcon /> Refazer
                </Button>
                <Button
                  onClick={upload}
                  className="flex-1"
                  disabled={uploading}
                >
                  {uploading ? (
                    <RefreshCwIcon className="animate-spin" />
                  ) : (
                    <CheckIcon />
                  )}
                  {uploading ? "Publicando…" : "Publicar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <PartyPopperIcon className="size-8" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Foto publicada!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua foto já está na galeria do evento.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={scrollToGallery}>
                <ImageIcon /> Ver galeria
              </Button>
              <Button variant="outline" onClick={reset}>
                <CameraIcon /> Tirar outra
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FramePicker({
  frames,
  selectedFrameId,
  onSelect,
  onContinue,
}: {
  frames: Frame[];
  selectedFrameId: string | null;
  onSelect: (id: string | null) => void;
  onContinue: () => void;
}) {
  const options = [{ id: null }, ...frames];

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Escolha sua moldura</h2>
        <p className="text-sm text-muted-foreground">
          Selecione a moldura e depois tire a foto.
        </p>
      </div>

      {frames.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <UploadIcon className="mx-auto mb-2 size-6" />
          Ainda não há molduras neste evento. Você pode tirar a foto sem
          moldura.
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {options.map(({ id }) => {
          const frame = frames.find((f) => f.id === id);
          const selected = selectedFrameId === id;
          return (
            <button
              key={id ?? "none"}
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                "group relative aspect-[3/4] overflow-hidden rounded-lg border-2 bg-muted transition-all",
                selected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-border",
              )}
            >
              {frame ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={frame.image_url}
                  alt={frame.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-6" />
                </div>
              )}
              {selected ? (
                <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon className="size-3" />
                </span>
              ) : null}
              {frame ? (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] font-medium text-white">
                  {frame.name}
                </span>
              ) : (
                <span className="absolute inset-x-0 bottom-0 bg-black/40 px-1.5 pb-1 pt-4 text-left text-[10px] font-medium text-white">
                  Sem moldura
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Button size="lg" className="w-full" onClick={onContinue}>
        <CameraIcon /> Continuar para a foto
      </Button>
    </div>
  );
}
