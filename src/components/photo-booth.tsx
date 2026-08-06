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
  PlusIcon,
  RefreshCwIcon,
  SwitchCameraIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getDeviceTokenHash } from "@/lib/device-identity";
import { triggerAnalysis } from "@/lib/trigger-analysis";
import { useEventProfile } from "@/hooks/use-event-profile";
import {
  PHOTO_HEIGHT,
  PHOTO_WIDTH,
  type Event,
  type Frame,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "frame" | "camera" | "success";

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
  const [cameraReady, setCameraReady] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [acceptedUrls, setAcceptedUrls] = useState<string[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState(false);
  const { profile } = useEventProfile(event.id);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingRef = useRef<FacingMode>("user");
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const namePrefilledRef = useRef(false);

  const selectedFrame = frames.find((f) => f.id === selectedFrameId) ?? null;

  useEffect(() => {
    if (!namePrefilledRef.current && profile?.name?.trim()) {
      namePrefilledRef.current = true;
      setAuthorName(profile.name.trim());
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      acceptedUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setCameraReady(false);
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
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          await new Promise<void>((resolve) => {
            if (video.videoWidth > 0) {
              resolve();
              return;
            }
            video.addEventListener("loadedmetadata", () => resolve(), {
              once: true,
            });
          });
        }
        if (active) {
          setCameraError(null);
          setCameraReady(true);
        }
      } catch {
        if (active) {
          setCameraReady(false);
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
    if (!video || !video.videoWidth) {
      toast.error("Câmera ainda não está pronta", {
        description: "Aguarde um instante e tente novamente.",
      });
      return;
    }

    setFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(false), 450);

    let frameImg: HTMLImageElement | null = null;
    if (selectedFrame) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = selectedFrame.image_url;
        });
        frameImg = img;
      } catch {
        toast.error("Não foi possível carregar a moldura", {
          description: "Tente novamente ou escolha outra moldura.",
        });
        return;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_WIDTH;
    canvas.height = frameImg
      ? Math.round(PHOTO_WIDTH * (frameImg.height / frameImg.width))
      : PHOTO_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawCover(
      ctx,
      video,
      video.videoWidth,
      video.videoHeight,
      canvas.width,
      canvas.height,
      mirrored,
    );

    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 1),
    );
    if (!blob) return;

    setPendingUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  };

  const acceptPending = () => {
    if (!pendingUrl) return;
    setAcceptedUrls((prev) => [...prev, pendingUrl]);
    setPendingUrl(null);
  };

  const retakePending = () => {
    setPendingUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const removePhoto = (index: number) => {
    const removed = acceptedUrls[index];
    const next = acceptedUrls.filter((_, i) => i !== index);
    if (removed) URL.revokeObjectURL(removed);
    setAcceptedUrls(next);
    setViewingIndex((prev) => {
      if (prev === null) return prev;
      if (prev > index) return prev - 1;
      if (prev === index) return next.length === 0 ? null : Math.min(index, next.length - 1);
      return prev;
    });
  };

  const discardAll = () => {
    setPendingUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    acceptedUrls.forEach((u) => URL.revokeObjectURL(u));
    setAcceptedUrls([]);
    setViewingIndex(null);
    setStep("frame");
  };

  const publish = async () => {
    if (acceptedUrls.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const displayName = authorName.trim() || profile?.name?.trim() || null;

    let published = 0;
    for (const url of acceptedUrls) {
      const blob = await fetch(url)
        .then((r) => r.blob())
        .catch(() => null);
      if (!blob) {
        toast.error("Falha ao ler a foto", {
          description: "Tente publicar novamente.",
        });
        break;
      }
      const photoId = crypto.randomUUID();
      const path = `${event.id}/${photoId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) {
        toast.error("Falha no envio", {
          description: "Não conseguimos enviar a foto. Tente novamente.",
        });
        break;
      }

      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(path);

      const { data: inserted, error: insertError } = await supabase
        .from("photos")
        .insert({
          id: photoId,
          event_id: event.id,
          frame_id: selectedFrameId,
          storage_path: path,
          public_url: urlData.publicUrl,
          author_name: displayName,
          uploaded_by_profile_id: profile?.id ?? null,
          analysis_status: "pending",
        })
        .select("id")
        .single();

      if (insertError) {
        toast.error("Falha ao publicar", {
          description:
            "Não conseguimos salvar sua foto na galeria. Tente novamente.",
        });
        break;
      }

      try {
        const tokenHash = await getDeviceTokenHash(event.id);
        const linkedId = inserted?.id ?? photoId;
        const { error: linkError } = await supabase.rpc("link_uploaded_photo", {
          p_photo_id: linkedId,
          p_token_hash: tokenHash,
        });
        if (linkError) {
          await supabase.rpc("link_uploaded_photo_by_path", {
            p_storage_path: path,
            p_token_hash: tokenHash,
          });
        }
      } catch {
        // Silencioso: se nao houver perfil, a foto continua na galeria geral
      }

      published += 1;
    }

    triggerAnalysis(event.id);
    setUploading(false);

    if (published === 0) return;

    acceptedUrls.forEach((u) => URL.revokeObjectURL(u));
    setAcceptedUrls([]);
    setAuthorName("");
    setPendingUrl(null);
    setViewingIndex(null);

    toast.success(
      published === 1 ? "Foto publicada!" : `${published} fotos publicadas!`,
      {
        description: "Elas já aparecem na galeria do evento.",
      },
    );
    setStep("success");
  };

  const reset = () => {
    setPendingUrl(null);
    setAcceptedUrls([]);
    setViewingIndex(null);
    setAuthorName("");
    setStep("frame");
  };

  if (step === "camera") {
    return (
      <FullscreenCamera
        videoRef={videoRef}
        mirrored={mirrored}
        cameraError={cameraError}
        cameraReady={cameraReady}
        flash={flash}
        selectedFrame={selectedFrame}
        pendingUrl={pendingUrl}
        acceptedUrls={acceptedUrls}
        viewingIndex={viewingIndex}
        authorName={authorName}
        uploading={uploading}
        onAuthorNameChange={setAuthorName}
        onViewPhoto={setViewingIndex}
        onRemovePhoto={removePhoto}
        onPublish={publish}
        onClose={discardAll}
        onMirror={() => setMirrored((v) => !v)}
        onFlip={switchCamera}
        onCapture={capture}
        onAcceptPending={acceptPending}
        onRetakePending={retakePending}
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

        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <PartyPopperIcon className="size-9" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Foto publicada!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Suas fotos já estão na galeria do evento.
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
  cameraReady,
  flash,
  selectedFrame,
  pendingUrl,
  acceptedUrls,
  viewingIndex,
  authorName,
  uploading,
  onAuthorNameChange,
  onViewPhoto,
  onRemovePhoto,
  onPublish,
  onClose,
  onMirror,
  onFlip,
  onCapture,
  onAcceptPending,
  onRetakePending,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mirrored: boolean;
  cameraError: string | null;
  cameraReady: boolean;
  flash: boolean;
  selectedFrame: Frame | null;
  pendingUrl: string | null;
  acceptedUrls: string[];
  viewingIndex: number | null;
  authorName: string;
  uploading: boolean;
  onAuthorNameChange: (value: string) => void;
  onViewPhoto: (index: number | null) => void;
  onRemovePhoto: (index: number) => void;
  onPublish: () => void;
  onClose: () => void;
  onMirror: () => void;
  onFlip: () => void;
  onCapture: () => void;
  onAcceptPending: () => void;
  onRetakePending: () => void;
}) {
  const live = !pendingUrl && viewingIndex === null;
  const viewingUrl =
    viewingIndex !== null ? acceptedUrls[viewingIndex] ?? null : null;

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
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      ) : null}

      {flash ? (
        <div className="animate-flash pointer-events-none absolute inset-0 z-10 bg-white" />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between p-4">
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
        ) : (
          <span />
        )}

        {acceptedUrls.length > 0 ? (
          <span className="flex size-10 items-center justify-center rounded-full bg-black/40 text-xs font-semibold text-white backdrop-blur-md">
            {acceptedUrls.length}
          </span>
        ) : (
          <span className="size-10" />
        )}
      </div>

      {live && !cameraError ? (
        <div className="absolute left-1/2 top-16 z-30 w-[min(20rem,85%)] -translate-x-1/2">
          <label className="sr-only" htmlFor="booth-author-name">
            Seu nome
          </label>
          <input
            id="booth-author-name"
            value={authorName}
            onChange={(e) => onAuthorNameChange(e.target.value)}
            placeholder="Seu nome (opcional)"
            maxLength={60}
            className="h-10 w-full rounded-full border-0 bg-black/40 px-4 text-center text-sm text-white placeholder:text-white/60 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>
      ) : null}

      {cameraError && live ? (
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

      {pendingUrl ? (
        <div className="absolute inset-0 z-20 flex flex-col bg-black">
          <div className="flex flex-1 items-center justify-center px-4 pb-36 pt-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingUrl}
              alt="Foto capturada"
              className="max-h-full w-auto max-w-full rounded-lg object-contain"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-center gap-14 px-6 pb-12">
            <button
              type="button"
              onClick={onRetakePending}
              aria-label="Tirar novamente"
              className="flex flex-col items-center gap-2 text-white"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition-colors hover:bg-black/60 active:scale-95">
                <RefreshCwIcon className="size-7" />
              </span>
              <span className="text-xs font-medium">Refazer</span>
            </button>

            <button
              type="button"
              onClick={onAcceptPending}
              aria-label="Usar foto"
              className="flex flex-col items-center gap-2 text-white"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgb(255_255_255/0.35)] transition-transform duration-150 active:scale-90">
                <CheckIcon className="size-9" strokeWidth={3} />
              </span>
              <span className="text-xs font-medium">Usar foto</span>
            </button>
          </div>
        </div>
      ) : null}

      {viewingUrl ? (
        <div className="absolute inset-0 z-20 flex flex-col bg-black">
          <div className="flex flex-1 items-center justify-center px-4 pb-36 pt-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingUrl}
              alt={`Foto ${(viewingIndex ?? 0) + 1}`}
              className="max-h-full w-auto max-w-full rounded-lg object-contain"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-center gap-14 px-6 pb-12">
            <button
              type="button"
              onClick={() => onViewPhoto(null)}
              aria-label="Voltar"
              className="flex flex-col items-center gap-2 text-white"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-md transition-colors hover:bg-black/60 active:scale-95">
                <ArrowLeftIcon className="size-7" />
              </span>
              <span className="text-xs font-medium">Voltar</span>
            </button>

            <button
              type="button"
              onClick={() => onRemovePhoto(viewingIndex ?? 0)}
              aria-label="Remover foto"
              className="flex flex-col items-center gap-2 text-white"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-red-500/80 shadow-[0_0_0_4px_rgb(255_255_255/0.25)] transition-transform duration-150 active:scale-90">
                <Trash2Icon className="size-7" />
              </span>
              <span className="text-xs font-medium">Remover</span>
            </button>
          </div>
        </div>
      ) : null}

      {live ? (
        <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-4 px-6 pb-6">
          {acceptedUrls.length > 0 ? (
            <div className="flex items-center gap-2 rounded-2xl bg-black/50 p-2 backdrop-blur-md">
              <div className="flex max-w-[55vw] items-center gap-2 overflow-x-auto">
                {acceptedUrls.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onViewPhoto(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-black ring-2 ring-white/40 transition-transform duration-150 hover:scale-105 active:scale-95"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Foto ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onCapture}
                  aria-label="Adicionar nova foto"
                  className="flex size-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white/40 text-white transition-colors hover:bg-white/10"
                >
                  <PlusIcon className="size-5" />
                </button>
              </div>
              <Button
                size="sm"
                onClick={onPublish}
                disabled={uploading}
                className="shrink-0 rounded-full"
              >
                {uploading ? (
                  <RefreshCwIcon className="animate-spin" />
                ) : (
                  <CheckIcon />
                )}
                {uploading ? "Publicando…" : "Publicar"}
              </Button>
            </div>
          ) : null}

          <div className="flex items-end justify-center gap-12">
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
              disabled={!!cameraError || !cameraReady}
              aria-label={cameraReady ? "Tirar foto" : "Aguardando câmera"}
              className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-white shadow-[0_0_0_4px_rgb(255_255_255/0.35)] transition-transform duration-150 active:scale-90 disabled:opacity-60"
            >
              {!cameraReady && !cameraError ? (
                <RefreshCwIcon className="size-7 animate-spin text-black/60" />
              ) : null}
            </button>

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
      ) : null}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "frame", label: "Moldura" },
    { key: "camera", label: "Foto" },
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
          {frames.map((frame) => {
            const selected = selectedFrameId === frame.id;
            return (
              <button
                key={frame.id}
                type="button"
                onClick={() => onSelect(frame.id)}
                className={cn(
                  "group relative aspect-[3/4] overflow-hidden rounded-lg border-2 bg-muted transition-all duration-200 sm:rounded-xl",
                  selected
                    ? "border-primary ring-2 ring-primary/25 shadow-md"
                    : "border-transparent hover:border-foreground/15 hover:shadow-sm",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frame.image_url}
                  alt={frame.name}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                />
                {selected ? (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <CheckIcon className="size-3" />
                  </span>
                ) : null}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] font-medium text-white">
                  {frame.name}
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
