import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CameraIcon,
  CalendarIcon,
  CheckCheckIcon,
  ClockIcon,
  ImagesIcon,
  UsersIcon,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Métricas · Photo Hub",
};

const DAYS = 14;

function buildDays(photos: { created_at: string }[]) {
  const days: { date: Date; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDate = new Map<string, number>();
  for (const photo of photos) {
    const d = new Date(photo.created_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toDateString();
    byDate.set(key, (byDate.get(key) ?? 0) + 1);
  }
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ date: d, count: byDate.get(d.toDateString()) ?? 0 });
  }
  return days;
}

export default async function MetricsPage() {
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
        .select("id, email, is_admin, active, created_at"),
      supabase.from("events").select("id, name, user_id, active, created_at"),
      supabase.from("photos").select("event_id, approved, archived, created_at"),
    ]);

  const list = photos ?? [];
  const eventsList = events ?? [];
  const profilesList = profiles ?? [];

  const approved = list.filter((p) => p.approved && !p.archived);
  const pending = list.filter((p) => !p.approved && !p.archived);
  const clients = profilesList.filter((p) => !p.is_admin);
  const activeClients = clients.filter((c) => c.active);
  const activeEvents = eventsList.filter((e) => e.active);

  const kpis = [
    {
      label: "Clientes",
      value: clients.length,
      sub: `${activeClients.length} ativos`,
      icon: UsersIcon,
    },
    {
      label: "Eventos",
      value: eventsList.length,
      sub: `${activeEvents.length} ativos`,
      icon: CalendarIcon,
    },
    {
      label: "Fotos",
      value: list.length,
      sub: `${approved.length} publicadas`,
      icon: CameraIcon,
    },
    {
      label: "Pendentes",
      value: pending.length,
      sub: `de aprovação`,
      icon: ClockIcon,
    },
  ];

  const approvalRate = list.length
    ? Math.round((approved.length / list.length) * 100)
    : 0;

  const days = buildDays(list);
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const photosByEvent = new Map<string, number>();
  for (const photo of list) {
    photosByEvent.set(
      photo.event_id,
      (photosByEvent.get(photo.event_id) ?? 0) + 1,
    );
  }
  const eventsByClient = new Map<string, number>();
  for (const event of eventsList) {
    eventsByClient.set(
      event.user_id ?? "",
      (eventsByClient.get(event.user_id ?? "") ?? 0) + 1,
    );
  }

  const topEvents = [...eventsList]
    .sort(
      (a, b) =>
        (photosByEvent.get(b.id) ?? 0) - (photosByEvent.get(a.id) ?? 0),
    )
    .slice(0, 5);

  return (
    <>
      <AdminHeader
        title="Métricas"
        subtitle="Visão geral do uso da plataforma: clientes, eventos e fotos."
        isAdmin
      />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <kpi.icon className="size-4 text-foreground/50" />
              </div>
              <p className="mt-1.5 text-2xl font-bold tabular-nums">
                {kpi.value}
              </p>
              <p className="text-xs text-muted-foreground">{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Fotos nos últimos {DAYS} dias</h2>
              <span className="text-sm text-muted-foreground">
                {list.length} no total
              </span>
            </div>
            <div className="mt-4 flex h-40 items-end gap-1.5">
              {days.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className="group flex flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {day.count > 0 ? day.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                    style={{
                      height: `${Math.max(
                        day.count > 0 ? (day.count / maxDay) * 100 : 2,
                        2,
                      )}%`,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {day.date.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Taxa de aprovação</h2>
              <CheckCheckIcon className="size-4 text-foreground/50" />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {approvalRate}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {approved.length} aprovadas de {list.length} fotos
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${approvalRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 font-semibold">Eventos com mais fotos</h2>
            {topEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum evento ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {topEvents.map((event, i) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-4 py-2.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 text-muted-foreground">
                        {i + 1}º
                      </span>
                      <span className="truncate font-medium">{event.name}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ImagesIcon className="size-3.5" />
                      {photosByEvent.get(event.id) ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Eventos por cliente</h2>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum cliente ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {clients.slice(0, 8).map((client) => (
                  <li
                    key={client.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate">{client.email}</span>
                    <span className="text-xs text-muted-foreground">
                      {eventsByClient.get(client.id) ?? 0}{" "}
                      {((eventsByClient.get(client.id) ?? 0) === 1
                        ? "evento"
                        : "eventos")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
