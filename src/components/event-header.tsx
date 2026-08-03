import type { Event } from "@/lib/types";

export function EventHeader({ event }: { event: Event }) {
  return (
    <header className="mb-6 text-center">
      {event.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_url}
          alt=""
          className="mx-auto mb-4 h-24 w-24 rounded-2xl object-cover shadow-md"
        />
      ) : null}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {event.name}
      </h1>
      {event.description ? (
        <p className="mx-auto mt-1 max-w-md text-muted-foreground">
          {event.description}
        </p>
      ) : null}
    </header>
  );
}
