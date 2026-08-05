"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { GlobalPerson } from "@/lib/types";

export function PeopleDirectory({ people }: { people: GlobalPerson[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        p.display_name.toLowerCase().includes(q) ||
        p.events.some((e) => e.event_name.toLowerCase().includes(q)),
    );
  }, [people, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou evento…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhuma pessoa encontrada.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((person) => {
            const isOpen = expanded === person.person_key;
            return (
              <li
                key={person.person_key}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(isOpen ? null : person.person_key)
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="size-11 shrink-0 overflow-hidden rounded-full bg-muted">
                    {person.reference_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.reference_photo_url}
                        alt={person.display_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <UserRoundIcon className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {person.display_name}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <UsersIcon className="size-3" />
                        {person.event_count}{" "}
                        {person.event_count === 1 ? "evento" : "eventos"}
                      </span>
                      <span aria-hidden>·</span>
                      <span>
                        {person.total_photo_count}{" "}
                        {person.total_photo_count === 1 ? "foto" : "fotos"}
                      </span>
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {isOpen ? (
                  <ul className="border-t bg-muted/20 px-4 py-2">
                    {person.events.map((event) => (
                      <li key={event.profile_id + event.event_id}>
                        <Link
                          href={`/admin/events/${event.event_id}`}
                          className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted"
                        >
                          <CalendarDaysIcon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {event.event_name}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {event.photo_count}{" "}
                            {event.photo_count === 1 ? "foto" : "fotos"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
