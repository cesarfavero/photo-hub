import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersIcon } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
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
        .select("id, email, is_admin, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("events")
        .select("id, name, slug, user_id, active, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("photos").select("event_id, approved"),
    ]);

  const photoCounts = new Map<string, { total: number; approved: number }>();
  for (const photo of photos ?? []) {
    const s = photoCounts.get(photo.event_id) ?? { total: 0, approved: 0 };
    s.total += 1;
    if (photo.approved) s.approved += 1;
    photoCounts.set(photo.event_id, s);
  }

  const eventsByUser = new Map<string, NonNullable<typeof events>>();
  for (const event of events ?? []) {
    const list = eventsByUser.get(event.user_id ?? "") ?? [];
    list.push(event);
    eventsByUser.set(event.user_id ?? "", list);
  }

  return (
    <>
      <AdminHeader
        title="Clientes"
        subtitle="Visão geral de todos os clientes e eventos do Photo Hub."
        isAdmin
      />
      <div className="space-y-4">
        {(profiles ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </div>
        ) : (
          (profiles ?? []).map((client) => {
            const clientEvents = eventsByUser.get(client.id) ?? [];
            return (
              <div
                key={client.id}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground/70">
                      <UsersIcon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{client.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Cliente desde{" "}
                        {new Date(client.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </p>
                    </div>
                  </div>
                  {client.is_admin ? (
                    <Badge>Admin</Badge>
                  ) : (
                    <Badge variant="secondary">Cliente</Badge>
                  )}
                </div>

                {clientEvents.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {clientEvents.map((event) => {
                      const stats =
                        photoCounts.get(event.id) ?? { total: 0, approved: 0 };
                      return (
                        <li
                          key={event.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/60 px-4 py-2.5 text-sm"
                        >
                          <div>
                            <p className="font-medium">{event.name}</p>
                            <p className="text-xs text-muted-foreground">
                              /{event.slug} · {stats.total}{" "}
                              {stats.total === 1 ? "foto" : "fotos"} (
                              {stats.approved} publicadas)
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!event.active ? (
                              <Badge variant="secondary">Desativado</Badge>
                            ) : null}
                            <Link
                              href={`/${event.slug}`}
                              target="_blank"
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Abrir
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Nenhum evento ainda.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
