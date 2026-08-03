import type { Metadata } from "next";
import Link from "next/link";
import { CameraIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/admin/auth-form";

export const metadata: Metadata = {
  title: "Entrar · Photo Hub",
};

export default async function AdminLoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/admin");

  const allowSignup = process.env.NEXT_PUBLIC_ADMIN_SIGNUP === "true";

  return (
    <main className="bg-glow flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-400 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_12px_28px_-12px_oklch(0.25_0.03_55/0.5)]">
            <CameraIcon className="size-6" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel do evento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse para gerenciar molduras e fotos.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <AuthForm mode="login" />
        </div>
        {allowSignup ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link href="/admin/signup" className="font-medium text-foreground underline">
              Criar conta
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
