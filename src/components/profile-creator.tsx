"use client";

import { useEffect, useRef, useState } from "react";
import {
  CameraIcon,
  CheckIcon,
  RefreshCwIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getDeviceTokenHash } from "@/lib/device-identity";
import { triggerAnalysis } from "@/lib/trigger-analysis";
import type { Event, ParticipantProfile } from "@/lib/types";

type Step = "camera" | "captured" | "form" | "creating" | "success";

function normalizeProfile(data: unknown): ParticipantProfile | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as ParticipantProfile) ?? null;
  if (typeof data === "object" && data !== null && "id" in data) {
    return data as ParticipantProfile;
  }
  return null;
}

export function ProfileCreator({
  event,
  onCreated,
  onCancel,
}: {
  event: Event;
  onCreated: (profile: ParticipantProfile) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>("camera");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (step !== "camera") return;

    let active = true;
    void (async () => {
      setCameraReady(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Câmera não suportada");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 1280 },
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
            "Não conseguimos acessar a câmera. Verifique a permissão.",
          );
        }
      }
    })();

    return () => {
      active = false;
      stopCamera();
    };
  }, [step]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("Câmera ainda não está pronta", {
        description: "Aguarde um instante e tente novamente.",
      });
      return;
    }

    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    // Mirror selfie for natural look
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (capturedUrl) URL.revokeObjectURL(capturedUrl);
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        setStep("captured");
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  const retake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setStep("camera");
  };

  const submit = async () => {
    if (!capturedUrl || !name.trim()) return;
    setStep("creating");

    try {
      const supabase = createClient();
      const blob = await fetch(capturedUrl).then((r) => r.blob());
      const photoId = crypto.randomUUID();
      const path = `profiles/${event.id}/${photoId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) throw new Error("Falha ao enviar foto");

      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(path);
      const tokenHash = await getDeviceTokenHash(event.id);

      const { data, error } = await supabase.rpc("create_participant_profile", {
        p_event_id: event.id,
        p_token_hash: tokenHash,
        p_name: name.trim(),
        p_reference_photo_url: urlData.publicUrl,
      });

      if (error) throw error;
      const profile = normalizeProfile(data);
      if (!profile) throw new Error("Perfil não criado");

      const { data: inserted, error: insertError } = await supabase
        .from("photos")
        .insert({
          id: photoId,
          event_id: event.id,
          storage_path: path,
          public_url: urlData.publicUrl,
          author_name: name.trim(),
          uploaded_by_profile_id: profile.id,
          analysis_status: "pending",
        })
        .select("id")
        .single();

      if (!insertError && inserted?.id) {
        await supabase.rpc("link_uploaded_photo", {
          p_photo_id: inserted.id,
          p_token_hash: tokenHash,
        });
      }

      triggerAnalysis(event.id);

      setStep("success");
      toast.success("Perfil criado!", {
        description: "Estamos procurando suas fotos neste evento.",
      });
      onCreated(profile);
    } catch (e) {
      setStep("form");
      toast.error("Erro ao criar perfil", {
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      {step === "camera" && (
        <div className="space-y-4">
          <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
            />
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black p-6 text-center">
                <p className="text-sm text-white/80">{cameraError}</p>
              </div>
            ) : null}
          </div>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={onCancel}>
              <XIcon /> Cancelar
            </Button>
            <Button
              onClick={capture}
              disabled={!!cameraError || !cameraReady}
            >
              {!cameraReady && !cameraError ? (
                <RefreshCwIcon className="animate-spin" />
              ) : (
                <CameraIcon />
              )}
              {cameraReady ? "Tirar foto" : "Aguardando câmera"}
            </Button>
          </div>
        </div>
      )}

      {step === "captured" && capturedUrl && (
        <div className="space-y-4">
          <div className="mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedUrl}
              alt="Foto de referência"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={retake}>
              <RefreshCwIcon /> Refazer
            </Button>
            <Button onClick={() => setStep("form")}>
              <CheckIcon /> Continuar
            </Button>
          </div>
        </div>
      )}

      {(step === "form" || step === "creating") && (
        <div className="space-y-4">
          {capturedUrl && (
            <div className="mx-auto aspect-square w-24 overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedUrl}
                alt="Foto de referência"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="flex items-center gap-2">
              <UserRoundIcon className="size-4" /> Seu nome
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Maria Souza"
              maxLength={60}
              className="h-11 text-base"
              disabled={step === "creating"}
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Usaremos esta foto para ajudar a encontrar outras fotos suas neste
            evento.
          </p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={step === "creating"}
            >
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={!name.trim() || step === "creating"}
            >
              {step === "creating" ? (
                <RefreshCwIcon className="animate-spin" />
              ) : (
                <CheckIcon />
              )}
              {step === "creating" ? "Criando…" : "Criar perfil"}
            </Button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckIcon className="size-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Perfil criado!</h3>
            <p className="text-sm text-muted-foreground">
              Estamos procurando suas fotos neste evento.
            </p>
          </div>
          <Button onClick={onCancel}>Fechar</Button>
        </div>
      )}
    </div>
  );
}
