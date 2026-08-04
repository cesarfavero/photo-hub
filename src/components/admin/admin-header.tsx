"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, LogOutIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AdminHeader({
  title,
  subtitle,
  backHref,
  isAdmin = false,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Voltar"
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <ArrowLeftIcon className="size-5" />
          </Link>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<Link href="/admin/clientes" />}
          >
            <UsersIcon className="size-4" />
            Clientes
          </Button>
        ) : null}
        <Button variant="outline" size="icon" onClick={logout} aria-label="Sair">
          <LogOutIcon />
        </Button>
      </div>
    </header>
  );
}
