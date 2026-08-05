import { AdminHeader } from "@/components/admin/admin-header";
import { CreateEventDialog } from "@/components/admin/create-event-dialog";
import { EventCard } from "@/components/admin/event-card";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export async function MyEventsDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  const eventIds = (events ?? []).map((event) => event.id);
  const { data: photos } = eventIds.length
    ? await supabase
        .from("photos")
        .select("event_id, approved")
        .in("event_id", eventIds)
    : { data: [] };

  const stats = new Map<string, { total: number; approved: number }>();
  for (const photo of photos ?? []) {
    const s = stats.get(photo.event_id) ?? { total: 0, approved: 0 };
    s.total += 1;
    if (photo.approved) s.approved += 1;
    stats.set(photo.event_id, s);
  }

  const origin = getOrigin();

  return (
    <>
      <AdminHeader
        title="Meus eventos"
        subtitle="Crie eventos, gerencie molduras e acompanhe as fotos."
      />
      <CreateEventDialog />
      <div className="mt-6 space-y-4">
        {events && events.length > 0 ? (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              stats={stats.get(event.id) ?? { total: 0, approved: 0 }}
              origin={origin}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nenhum evento ainda. Crie o primeiro para gerar o QR code.
          </div>
        )}
      </div>
    </>
  );
}

function getOrigin() {
  return getSiteUrl();
}
