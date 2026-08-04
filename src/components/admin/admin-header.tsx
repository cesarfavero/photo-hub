"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BarChart3Icon,
  LogOutIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const adminLinks = [
  { href: "/admin/metricas", label: "Métricas", icon: BarChart3Icon },
  { href: "/admin/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/admin/configuracoes", label: "Configurações", icon: SettingsIcon },
];

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
  const pathname = usePathname();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="mb-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
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
        <Button variant="outline" size="icon" onClick={logout} aria-label="Sair">
          <LogOutIcon />
        </Button>
      </div>

      {isAdmin ? (
        <nav className="flex flex-wrap gap-1.5">
          {adminLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Button
                key={link.href}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
                nativeButton={false}
                render={<Link href={link.href} />}
              >
                <link.icon className="size-4" />
                {link.label}
              </Button>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
