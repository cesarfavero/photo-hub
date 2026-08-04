"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckIcon,
  FlipHorizontalIcon,
  ImageIcon,
  PartyPopperIcon,
  RefreshCwIcon,
  SwitchCameraIcon,
  UserRoundIcon,
  XIcon,
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
  const [mirrored, setMirrored] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingRef = useRef<FacingMode>("user");
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedFrame = frames.find((f) => f.id === selectedFrameId) ?? null;

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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

  useEffect(() => {
    if (step !== "camera") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [step]);

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    setFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(false), 450);

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
      mirrored,
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
        toast.error("Não foi possível carregar a moldura", {
          description: "Tente novamente ou escolha outra moldura.",
        });
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
      toast.error("Falha no envio", {
        description: "Não conseguimos enviar a foto. Tente novamente.",
      });
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
      toast.error("Falha ao publicar", {
        description:
          "Não conseguimos salvar sua foto na galeria. Tente novamente.",
      });
      setUploading(false);
      return;
    }

    toast.success("Foto publicada!", {
      description: "Ela já aparece na galeria do evento.",
    });
    setUploading(false);
    setStep("success");
  };

  const reset = () => {
    setCapturedUrl(null);
    setAuthorName("");
    setStep("frame");
  };

  if (step === "camera") {
    return (
      <FullscreenCamera
        videoRef={videoRef}
        mirrored={mirrored}
        cameraError={cameraError}
        flash={flash}
        selectedFrame={selectedFrame}
        onMirror={() => setMirrored((v) => !v)}
        onFlip={switchCamera}
        onClose={() => setStep("frame")}
        onCapture={capture}
      />
    );
  }

  return (
    <section id="cabine">
      <StepIndicator step={step} />

      <div
        key={step}
        className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      >
        {step === "frame" && (
          <FramePicker
            frames={frames}
            selectedFrameId={selectedFrameId}
            onSelect={setSelectedFrameId}
            onContinue={() => setStep("camera")}
          />
        )}

          {step === "captured" && capturedUrl && (
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-[380px] overflow-hidden rounded-xl bg-black aspect-[3/4] ring-1 ring-foreground/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedUrl}
                  alt="Foto capturada"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="mt-6 w-full max-w-[380px] space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="author-name"
                    className="flex items-center gap-2"
                  >
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
                    onClick={() => {
                      setCapturedUrl(null);
                      setStep("camera");
                    }}
                    className="flex-1"
                    disabled={uploading}
                  >
                    <ArrowLeftIcon /> Refazer
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
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                <PartyPopperIcon className="size-9" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Foto publicada!</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sua foto já está na galeria do evento.
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <Button
                  nativeButton={false}
                  render={<Link href={`/${event.slug}/galeria`} />}
                >
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

function FullscreenCamera({
  videoRef,
  mirrored,
  cameraError,
  flash,
  selectedFrame,
  onMirror,
  onFlip,
  onClose,
  onCapture,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mirrored: boolean;
  cameraError: string | null;
  flash: boolean;
  selectedFrame: Frame | null;
  onMirror: () => void;
  onFlip: () => void;
  onClose: () => void;
  onCapture: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 h-dvh w-full bg-black animate-in fade-in-0 duration-200">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          mirrored && "-scale-x-100",
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

      {flash ? (
        <div className="animate-flash pointer-events-none absolute inset-0 z-10 bg-white" />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar câmera"
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 active:scale-95"
        >
          <XIcon className="size-5" />
        </button>

        {selectedFrame ? (
          <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            {selectedFrame.name}
          </span>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onFlip}
            aria-label="Trocar câmera frontal/traseira"
            className={cn(
              "flex size-10 items-center justify-center rounded-full text-white backdrop-blur-md transition-colors active:scale-95",
              mirrored ? "bg-black/40" : "bg-black/40",
            )}
          >
            <SwitchCameraIcon className="size-5" />
          </button>
        </div>
      </div>

      {cameraError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black p-8 text-center">
          <div className="max-w-sm space-y-3">
            <p className="text-sm text-white/90">{cameraError}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-12 px-6 pb-10 sm:pb-14">
        <button
          type="button"
          onClick={onFlip}
          aria-label="Trocar câmera"
          className="mb-6 flex size-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 active:scale-95"
        >
          <SwitchCameraIcon className="size-5" />
        </button>

        <button
          type="button"
          onClick={onCapture}
          disabled={!!cameraError}
          aria-label="Tirar foto"
          className="size-20 rounded-full border-4 border-white bg-white shadow-[0_0_0_4px_rgb(255_255_255/0.35)] transition-transform duration-150 active:scale-90 disabled:opacity-60"
        />

        <button
          type="button"
          onClick={onMirror}
          aria-label="Espelhar imagem"
          className={cn(
            "mb-6 flex size-12 items-center justify-center rounded-full text-white backdrop-blur-md transition-colors active:scale-95",
            mirrored
              ? "bg-black/40 ring-2 ring-white/40"
              : "bg-black/40 ring-1 ring-white/20",
          )}
        >
          <FlipHorizontalIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "frame", label: "Moldura" },
    { key: "camera", label: "Foto" },
    { key: "captured", label: "Nome" },
    { key: "success", label: "Publicar" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <ol className="mb-6 flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li
            key={s.key}
            className={cn(
              "flex items-center gap-1 sm:gap-2 text-xs transition-colors",
              active
                ? "font-medium text-foreground"
                : done
                  ? "text-foreground/70"
                  : "text-muted-foreground/60",
            )}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] transition-colors",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-foreground/30 bg-foreground/5"
                    : "border-border",
              )}
            >
              {done ? <CheckIcon className="size-3" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  "h-px w-4 sm:w-6",
                  i < currentIndex ? "bg-primary/50" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
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
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Escolha sua moldura</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione a moldura e depois tire a foto.
        </p>
      </div>

      {frames.length === 0 ? null : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5">
          {options.map(({ id }) => {
            const frame = frames.find((f) => f.id === id);
            const selected = selectedFrameId === id;
            return (
              <button
                key={id ?? "none"}
                type="button"
                onClick={() => onSelect(id)}
                className={cn(
                  "group relative aspect-[3/4] overflow-hidden rounded-lg border-2 bg-muted transition-all duration-200 sm:rounded-xl",
                  selected
                    ? "border-primary ring-2 ring-primary/25 shadow-md"
                    : "border-transparent hover:border-foreground/15 hover:shadow-sm",
                )}
              >
                {frame ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={frame.image_url}
                    alt={frame.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-6" />
                  </div>
                )}
                {selected ? (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <CheckIcon className="size-3" />
                  </span>
                ) : null}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] font-medium text-white">
                  {frame ? frame.name : "Sem moldura"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Button
        size="lg"
        className="w-full gap-2 rounded-full"
        onClick={onContinue}
      >
        <CameraIcon /> Continuar para a foto
      </Button>
    </div>
  );
}
