"use client";

import { EVENT_ICONS } from "@/lib/event-icons";
import { cn } from "@/lib/utils";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
      {EVENT_ICONS.map((option) => {
        const selected = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            title={option.label}
            aria-label={`Ícone ${option.label}`}
            aria-pressed={selected}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-90",
              selected
                ? "bg-primary/10 text-primary ring-2 ring-primary"
                : "ring-1 ring-transparent",
            )}
          >
            <option.icon className="size-5" strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
