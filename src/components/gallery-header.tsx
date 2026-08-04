import Link from "next/link";
import { ArrowLeftIcon, CameraIcon } from "lucide-react";
import type { Event } from "@/lib/types";

export function GalleryHeader({ event }: { event: Event }) {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={`/${event.slug}`}
          aria-label="Voltar para o evento"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {event.name}
          </p>
          <p className="text-xs text-muted-foreground">Galeria do evento</p>
        </div>
        <Link
          href={`/${event.slug}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-95"
        >
          <CameraIcon className="size-4" />
          <span className="hidden sm:inline">Tirar foto</span>
        </Link>
      </div>
    </header>
  );
}
