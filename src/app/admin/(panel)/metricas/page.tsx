import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ActivityIcon,
  CalendarIcon,
  CameraIcon,
  CheckCheckIcon,
  ClockIcon,
  FlameIcon,
  FrameIcon,
  ImagesIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { createClient } from "@/lib/supabase/server";
import {
  bestDay,
  bestHour,
  countBefore,
  createdWithin,
  hourlyDistribution,
  photosPerDay,
  pctGrowth,
  sumRecent,
  topEvents,
  weekdayDistribution,
  WEEKDAY_LABELS,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Métricas · Photo Hub",
};

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

  const [{ data: profiles }, { data: events }, { data: photos }, { data: frames }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, is_admin, active, created_at"),
      supabase
        .from("events")
        .select("id, name, slug, user_id, active, created_at"),
      supabase
        .from("photos")
        .select("event_id, frame_id, author_name, approved, archived, created_at"),
      supabase.from("frames").select("id, event_id, name"),
    ]);

  const clients = (profiles ?? []).filter((p) => !p.is_admin);
  const eventsList = events ?? [];
  const photosList = photos ?? [];
  const framesList = frames ?? [];

  const activeClients = clients.filter((c) => c.active);
  const blockedClients = clients.length - activeClients.length;
  const activeEvents = eventsList.filter((e) => e.active);
  const approved = photosList.filter((p) => p.approved && !p.archived);
  const pending = photosList.filter((p) => !p.approved && !p.archived);
  const archived = photosList.filter((p) => p.archived);

  const photosLast7 = sumRecent(photosList, 7);
  const photosLast30 = sumRecent(photosList, 30);
  const photosPrev7 = countBefore(photosList, 7);
  const weeklyGrowth = pctGrowth(photosLast7, photosPrev7);
  const newClients7 = createdWithin(clients, 7);
  const newEvents30 = createdWithin(eventsList, 30);

  const approvalRate = photosList.length
    ? Math.round((approved.length / photosList.length) * 100)
    : 0;

  const kpis = [
    { label: "Clientes", value: clients.length, sub: `${activeClients.length} ativos · ${blockedClients} bloqueados`, icon: UsersIcon },
    { label: "Eventos", value: eventsList.length, sub: `${activeEvents.length} ativos`, icon: CalendarIcon },
    { label: "Fotos", value: photosList.length, sub: `${photosLast30} no mês`, icon: CameraIcon },
    { label: "Publicadas", value: approved.length, sub: `${approvalRate}% do total`, icon: CheckCheckIcon },
    { label: "Pendentes", value: pending.length, sub: "aguardando aprovação", icon: ClockIcon },
    { label: "Arquivadas", value: archived.length, sub: "fora da galeria", icon: ImagesIcon },
  ];

  const days = photosPerDay(photosList, 30);
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const hours = hourlyDistribution(photosList);
  const maxHour = Math.max(1, ...hours.map((h) => h.count));
  const weekdays = weekdayDistribution(photosList);
  const maxWeekday = Math.max(1, ...weekdays.map((w) => w.count));
  const peakHour = bestHour(hours);
  const topDay = bestDay(days);
  const topEvent = topEvents(eventsList, photosList, 1)[0];

  const frameName = new Map(framesList.map((f) => [f.id, f.name]));
  const frameCounts = new Map<string, number>();
  for (const photo of photosList) {
    if (!photo.frame_id) continue;
    frameCounts.set(photo.frame_id, (frameCounts.get(photo.frame_id) ?? 0) + 1);
  }
  const topFrames = [...frameCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ name: frameName.get(id) ?? "Moldura", count }));
  const maxFrame = Math.max(1, ...topFrames.map((f) => f.count));

  const insights: { icon: typeof ActivityIcon; text: string }[] = [
    {
      icon: TrendingUpIcon,
      text:
        weeklyGrowth === null
          ? "As fotos da semana estão começando a aquecer."
          : `Fotos ${weeklyGrowth >= 0 ? "cresceram" : "caíram"} ${Math.abs(weeklyGrowth)}% na última semana vs o período anterior.`,
    },
    {
      icon: ActivityIcon,
      text:
        peakHour.count > 0
          ? `Pico de fotos às ${peakHour.hour}h (${peakHour.count} na semana analisada).`
          : "Ainda sem fotos para analisar o pico de horário.",
    },
    {
      icon: FlameIcon,
      text:
        topDay.count > 0
          ? `O dia mais movimentado foi ${topDay.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })} com ${topDay.count} fotos.`
          : "Nenhum dia com fotos ainda.",
    },
    {
      icon: FlameIcon,
      text:
        topEvent && topEvent.photos > 0
          ? `O evento ${topEvent.event.name} lidera com ${topEvent.photos} fotos.`
          : "Nenhum evento com fotos ainda.",
    },
  ];

  return (
    <>
      <AdminHeader
        title="Métricas"
        subtitle="Análises completas de uso da plataforma."
      />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground">{kpi.label}</p>
                <kpi.icon className="size-4 text-foreground/50" />
              </div>
              <p className="mt-1.5 text-2xl font-bold tabular-nums">{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <GrowthCard label="Novos clientes (7d)" value={newClients7} icon={UsersIcon} />
          <GrowthCard label="Novos eventos (30d)" value={newEvents30} icon={CalendarIcon} />
          <GrowthCard
            label="Fotos na semana"
            value={photosLast7}
            icon={CameraIcon}
            badge={weeklyGrowth !== null ? `${weeklyGrowth >= 0 ? "+" : ""}${weeklyGrowth}%` : undefined}
            positive={weeklyGrowth === null || weeklyGrowth >= 0}
          />
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Fotos nos últimos 30 dias</h2>
            <span className="text-sm text-muted-foreground">{photosList.length} no total</span>
          </div>
          <div className="mt-4 flex h-48 items-end gap-1">
            {days.map((day) => (
              <div key={day.date.toISOString()} className="group flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[9px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {day.count}
                </span>
                <div
                  className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: `${Math.max(day.count > 0 ? (day.count / maxDay) * 100 : 2, 2)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{days[0].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
            <span>{days[days.length - 1].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Fotos por hora</h2>
            <div className="flex h-44 items-end gap-1">
              {hours.map((h) => (
                <div key={h.hour} className="group flex flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[9px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{h.count}</span>
                  <div
                    className={cn("w-full rounded-t transition-colors", h.hour === peakHour.hour && peakHour.count > 0 ? "bg-primary" : "bg-primary/50")}
                    style={{ height: `${Math.max(h.count > 0 ? (h.count / maxHour) * 100 : 2, 2)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Fotos por dia da semana</h2>
            <div className="flex h-44 items-end gap-2">
              {weekdays.map((w) => (
                <div key={w.weekday} className="group flex flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[9px] font-medium text-muted-foreground">{w.count > 0 ? w.count : ""}</span>
                  <div
                    className="w-full rounded-t bg-primary/60 transition-colors group-hover:bg-primary"
                    style={{ height: `${Math.max(w.count > 0 ? (w.count / maxWeekday) * 100 : 2, 2)}%` }}
                  />
                  <span className="mt-1 text-[10px] text-muted-foreground">{WEEKDAY_LABELS[w.weekday]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <FrameIcon className="size-4 text-foreground/50" />
              Molduras mais usadas
            </h2>
            {topFrames.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma foto com moldura ainda.</p>
            ) : (
              <ul className="space-y-3">
                {topFrames.map((frame) => (
                  <li key={frame.name} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="truncate pr-2 font-medium">{frame.name}</span>
                      <span className="text-xs text-muted-foreground">{frame.count}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(frame.count / maxFrame) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Eventos com mais fotos</h2>
            {topEvents(eventsList, photosList, 6).filter((t) => t.photos > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento com fotos ainda.</p>
            ) : (
              <ul className="space-y-2">
                {topEvents(eventsList, photosList, 6).map(({ event, photos }, i) => (
                  <li key={event.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 px-4 py-2.5 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 text-muted-foreground">{i + 1}º</span>
                      <span className="truncate font-medium">{event.name}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CameraIcon className="size-3.5" />
                      {photos}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Eventos por cliente</h2>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente ainda.</p>
            ) : (
              <ul className="space-y-2">
                {clients.slice(0, 8).map((client) => {
                  const clientEvents = eventsList.filter((e) => e.user_id === client.id);
                  const clientPhotos = clientEvents.reduce((sum, e) => sum + photosList.filter((p) => p.event_id === e.id).length, 0);
                  return (
                    <li key={client.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{client.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {clientEvents.length} ev · {clientPhotos} fotos
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Insights</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border bg-background/60 p-4 text-sm">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <insight.icon className="size-4" />
                </span>
                <span className="text-muted-foreground">{insight.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function GrowthCard({
  label,
  value,
  icon: Icon,
  badge,
  positive = true,
}: {
  label: string;
  value: number;
  icon: typeof UsersIcon;
  badge?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground/70">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
      {badge ? (
        <span
          className={cn(
            "rounded-full px-2 py-1 text-xs font-bold tabular-nums",
            positive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600",
          )}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}
