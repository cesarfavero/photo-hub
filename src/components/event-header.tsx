import type { Event } from "@/lib/types";
import { DEFAULT_EVENT_ICON } from "@/lib/event-icons";

export function EventHeader({ event }: { event: Event }) {
  return (
    <header className="mb-8 flex flex-col items-center text-center">
      {event.cover_url ? (
        <div className="mb-5 rounded-3xl bg-gradient-to-br from-muted to-muted/50 p-1.5 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.cover_url}
            alt=""
            className="h-24 w-24 rounded-[1.25rem] object-cover"
          />
        </div>
      ) : (
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-card ring-1 ring-foreground/10 shadow-sm">
          <span className="text-4xl leading-none">
            {event.icon || DEFAULT_EVENT_ICON}
          </span>
        </div>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {event.name}
      </h1>
      {event.description ? (
        <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-muted-foreground sm:text-base">
          {event.description}
        </p>
      ) : null}
    </header>
  );
}
