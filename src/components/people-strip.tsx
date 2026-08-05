"use client";

import { UserRoundIcon } from "lucide-react";
import type { EventPerson } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PeopleStrip({
  people,
  selectedId,
  myProfileId,
  onSelect,
  loading,
}: {
  people: EventPerson[];
  selectedId: string | null;
  myProfileId: string | null;
  onSelect: (id: string | null) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mb-4 flex gap-3 overflow-x-auto px-1 pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <div className="size-14 animate-pulse rounded-full bg-muted" />
            <div className="h-2.5 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (people.length === 0) return null;

  return (
    <div className="mb-4 -mx-1">
      <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-thin">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex w-16 shrink-0 flex-col items-center gap-1.5"
        >
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-full border-2 bg-muted text-xs font-medium transition-all",
              selectedId === null
                ? "border-primary ring-2 ring-primary/25"
                : "border-transparent",
            )}
          >
            Todos
          </div>
          <span className="w-full truncate text-center text-[10px] text-muted-foreground">
            Galeria
          </span>
        </button>

        {people.map((person) => {
          const selected = selectedId === person.id;
          const isMe = myProfileId === person.id;
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelect(person.id)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "relative size-14 overflow-hidden rounded-full border-2 transition-all",
                  selected
                    ? "border-primary ring-2 ring-primary/25"
                    : isMe
                      ? "border-primary/50"
                      : "border-foreground/10",
                )}
              >
                {person.reference_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.reference_photo_url}
                    alt={person.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    <UserRoundIcon className="size-5" />
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "w-full truncate text-center text-[10px] font-medium",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {isMe ? "Você" : person.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
