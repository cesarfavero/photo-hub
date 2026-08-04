import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  CameraIcon,
  GalleryVerticalEndIcon,
  QrCodeIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/admin/auth-form";

export const metadata: Metadata = {
  title: "Entrar · Photo Hub",
};

const features = [
  {
    icon: QrCodeIcon,
    title: "QR code para o evento",
    text: "Os convidados chegam à cabine pela leitura do QR code.",
  },
  {
    icon: CameraIcon,
    title: "Fotos com molduras",
    text: "A foto é tirada na hora, com a moldura do evento.",
  },
  {
    icon: GalleryVerticalEndIcon,
    title: "Galeria ao vivo",
    text: "As fotos aparecem em tempo real para todo mundo ver.",
  },
];

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/admin");

  const allowSignup = process.env.NEXT_PUBLIC_ADMIN_SIGNUP === "true";

  return (
    <main className="bg-glow flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-xl shadow-black/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 sm:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 p-10 text-primary-foreground sm:flex">
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <CameraIcon className="size-5" strokeWidth={1.75} />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              A cabine de fotos do seu evento
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">
              Tudo funciona direto no celular dos convidados — sem aplicativo,
              sem cadastro.
            </p>
          </div>

          <ul className="relative space-y-5">
            {features.map((f) => (
              <li key={f.title} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <f.icon className="size-4" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="mt-0.5 text-xs text-primary-foreground/70">
                    {f.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-3 sm:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CameraIcon className="size-5" strokeWidth={1.75} />
            </div>
            <span className="font-semibold tracking-tight">Photo Hub</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              Painel do evento
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse para gerenciar molduras, fotos e QR codes.
            </p>
          </div>

          <div className="flex flex-1 flex-col">
            <AuthForm mode="login" />
            {allowSignup ? (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Ainda não tem conta?{" "}
                <Link
                  href="/admin/signup"
                  className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
                >
                  Criar conta
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </p>
            ) : null}
          </div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3.5" />
            Acesso restrito ao responsável pelo evento
          </p>
        </div>
      </div>
    </main>
  );
}
