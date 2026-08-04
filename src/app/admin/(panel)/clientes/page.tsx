import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { ClientRow } from "@/components/admin/client-row";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Clientes · Photo Hub",
};

export default async function ClientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/admin");

  const [{ data: profiles }, { data: events }, { data: photos }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, is_admin, active, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("events")
        .select("id, name, slug, user_id, active, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("photos").select("event_id"),
    ]);

  const photoCounts = new Map<string, number>();
  for (const photo of photos ?? []) {
    photoCounts.set(photo.event_id, (photoCounts.get(photo.event_id) ?? 0) + 1);
  }

  const eventsByUser = new Map<string, typeof events>();
  for (const event of events ?? []) {
    const list = eventsByUser.get(event.user_id ?? "") ?? [];
    list.push(event);
    eventsByUser.set(event.user_id ?? "", list);
  }

  const clients = (profiles ?? []).filter((c) => !c.is_admin);

  return (
    <>
      <AdminHeader
        title="Clientes"
        subtitle="Gerencie os clientes da plataforma: veja o uso e bloqueie quando necessário."
      />
      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </div>
        ) : (
          clients.map((client) => {
            const clientEvents = (eventsByUser.get(client.id) ?? []).map(
              (event) => ({
                id: event.id,
                name: event.name,
                slug: event.slug,
                active: event.active,
                photos: photoCounts.get(event.id) ?? 0,
              }),
            );
            return (
              <ClientRow
                key={client.id}
                client={client}
                events={clientEvents}
              />
            );
          })
        )}
      </div>
    </>
  );
}
