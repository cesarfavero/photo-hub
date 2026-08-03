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
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CameraIcon className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Painel do evento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse para gerenciar molduras e fotos.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
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
