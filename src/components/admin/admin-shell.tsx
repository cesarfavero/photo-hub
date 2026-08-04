"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3Icon,
  CameraIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const baseLinks = [{ href: "/admin", label: "Início", icon: HomeIcon }];

const adminLinks = [
  { href: "/admin/metricas", label: "Métricas", icon: BarChart3Icon },
  { href: "/admin/relatorios", label: "Relatórios", icon: FileTextIcon },
  { href: "/admin/clientes", label: "Clientes", icon: UsersIcon },
  { href: "/admin/configuracoes", label: "Configurações", icon: SettingsIcon },
];

type NavLink = { href: string; label: string; icon: typeof HomeIcon };

function NavLinks({
  links,
  isActive,
  onNavigate,
}: {
  links: NavLink[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <link.icon className="size-4.5" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex flex-col gap-1 border-t pt-4">
      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ExternalLinkIcon className="size-4.5" />
        Ver site
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOutIcon className="size-4.5" />
        Sair
      </button>
    </div>
  );
}

function initials(email: string) {
  const local = email.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

export function AdminShell({
  siteName,
  userEmail,
  isAdmin,
  children,
}: {
  siteName: string;
  userEmail: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh bg-glow">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-card px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CameraIcon className="size-5" />
          </div>
          <span className="truncate text-base font-bold tracking-tight">
            {siteName}
          </span>
        </div>
        <div className="flex-1">
          <NavLinks links={links} isActive={isActive} />
        </div>
        <SidebarFooter onLogout={() => void logout()} />
      </aside>

      <div className="flex flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
              className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
            >
              <MenuIcon className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CameraIcon className="size-4" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                {siteName}
              </span>
            </div>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            {initials(userEmail)}
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in-0 duration-200"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card px-4 py-6 shadow-xl animate-in slide-in-from-left-4 duration-200">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5 px-1">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <CameraIcon className="size-5" />
                </div>
                <span className="text-base font-bold tracking-tight">
                  {siteName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials(userEmail)}
              </div>
              <span className="truncate text-xs font-medium text-muted-foreground">
                {userEmail}
              </span>
            </div>
            <div className="flex-1">
              <NavLinks
                links={links}
                isActive={isActive}
                onNavigate={() => setOpen(false)}
              />
            </div>
            <SidebarFooter onLogout={() => void logout()} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
