"use client";

import { EVENT_ICONS } from "@/lib/event-icons";
import { cn } from "@/lib/utils";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
      {EVENT_ICONS.map((icon) => {
        const selected = value === icon.emoji;
        return (
          <button
            key={icon.emoji}
            type="button"
            onClick={() => onChange(icon.emoji)}
            title={icon.label}
            aria-label={`Ícone ${icon.label}`}
            aria-pressed={selected}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg text-xl transition-all duration-150 hover:bg-muted active:scale-90",
              selected
                ? "bg-primary/10 ring-2 ring-primary"
                : "ring-1 ring-transparent",
            )}
          >
            {icon.emoji}
          </button>
        );
      })}
    </div>
  );
}
