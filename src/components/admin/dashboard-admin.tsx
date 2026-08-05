import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CameraIcon,
  CheckCheckIcon,
  ClockIcon,
  FlameIcon,
  ImagesIcon,
  LightbulbIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { CreateEventDialog } from "@/components/admin/create-event-dialog";
import { createClient } from "@/lib/supabase/server";
import {
  average,
  bestDay,
  bestHour,
  countBefore,
  createdWithin,
  hourlyDistribution,
  periodDelta,
  photosPerDay,
  pctGrowth,
  sumRecent,
  topEvents,
  weekdayDistribution,
  WEEKDAY_LABELS,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

export async function DashboardAdmin() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: events }, { data: photos }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, is_admin, active, created_at"),
      supabase
        .from("events")
        .select("id, name, slug, user_id, active, created_at"),
      supabase
        .from("photos")
        .select("event_id, author_name, approved, archived, created_at, public_url")
        .order("created_at", { ascending: false }),
    ]);

  const clients = (profiles ?? []).filter((p) => !p.is_admin);
  const eventsList = events ?? [];
  const photosList = photos ?? [];

  const activeClients = clients.filter((c) => c.active);
  const activeEvents = eventsList.filter((e) => e.active);
  const approved = photosList.filter((p) => p.approved && !p.archived);
  const pending = photosList.filter((p) => !p.approved && !p.archived);

  const today = photosPerDay(photosList, 1)[0].count;
  const yesterday = photosPerDay(photosList, 2)[0].count;
  const todayDelta = pctGrowth(today, yesterday);
  const photosLast7 = sumRecent(photosList, 7);
  const photosPrev7 = countBefore(photosList, 7);
  const weeklyGrowth = pctGrowth(photosLast7, photosPrev7);

  const newClients7 = createdWithin(clients, 7);
  const newEvents30 = createdWithin(eventsList, 30);
  const deltaNewClients = periodDelta(clients, 7);
  const deltaNewEvents = periodDelta(eventsList, 30);

  const approvalRate = photosList.length
    ? Math.round((approved.length / photosList.length) * 100)
    : 0;
  const avgPerEvent = average(
    eventsList.map(
      (e) => photosList.filter((p) => p.event_id === e.id).length,
    ),
  );
  const guests = new Set(
    photosList.map((p) => p.author_name).filter((n): n is string => !!n),
  ).size;

  const days = photosPerDay(photosList, 14);
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const hours = hourlyDistribution(photosList);
  const maxHour = Math.max(1, ...hours.map((h) => h.count));
  const weekdays = weekdayDistribution(photosList);
  const maxWeekday = Math.max(1, ...weekdays.map((w) => w.count));

  const peakHour = bestHour(hours);
  const topDay = bestDay(days);
  const topEvent = topEvents(eventsList, photosList, 1)[0];

  const kpis = [
    {
      label: "Clientes ativos",
      value: activeClients.length,
      sub: `${clients.length - activeClients.length} bloqueados`,
      icon: UsersIcon,
      delta: deltaNewClients.pct,
      deltaHint: "novos (7d)",
    },
    {
      label: "Eventos ativos",
      value: activeEvents.length,
      sub: `${eventsList.length} no total`,
      icon: ImagesIcon,
      delta: deltaNewEvents.pct,
      deltaHint: "novos (30d)",
    },
    {
      label: "Fotos hoje",
      value: today,
      sub: `${photosLast7} nos últimos 7 dias`,
      icon: CameraIcon,
      delta: todayDelta,
      deltaHint: "vs ontem",
    },
    {
      label: "Fotos no total",
      value: photosList.length,
      sub: `${approved.length} publicadas`,
      icon: FlameIcon,
      delta: null,
    },
    {
      label: "Pendentes",
      value: pending.length,
      sub: "aguardando aprovação",
      icon: ClockIcon,
      delta: null,
    },
    {
      label: "Taxa de aprovação",
      value: `${approvalRate}%`,
      sub: `${approved.length} de ${photosList.length}`,
      icon: CheckCheckIcon,
      delta: null,
    },
  ];

  const insights: { icon: typeof ActivityIcon; text: string }[] = [
    {
      icon: TrendingUpIcon,
      text:
        weeklyGrowth === null
          ? "As fotos da semana estão começando a aquecer."
          : weeklyGrowth >= 0
            ? `As fotos cresceram ${weeklyGrowth}% na última semana em relação ao período anterior.`
            : `As fotos caíram ${Math.abs(weeklyGrowth)}% na última semana em comparação ao período anterior.`,
    },
    {
      icon: ActivityIcon,
      text:
        peakHour.count > 0
          ? `O pico de fotos acontece às ${peakHour.hour}h — melhor horário para reforçar a cabine.`
          : "Ainda não há fotos para analisar o melhor horário.",
    },
    {
      icon: FlameIcon,
      text:
        topEvent && topEvent.photos > 0
          ? `O evento ${topEvent.event.name} é o mais movimentado, com ${topEvent.photos} fotos.`
          : "Nenhum evento registrou fotos ainda.",
    },
    {
      icon: UsersIcon,
      text: `Em média, cada evento gera ${Math.round(avgPerEvent)} fotos e ${guests} convidados já publicaram com nome.`,
    },
  ];

  return (
    <>
      <AdminHeader
        title="Dashboard"
        subtitle="Visão geral do Photo Hub: crescimento, uso e fotos em tempo real."
      />
      <CreateEventDialog />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <kpi.icon className="size-4 text-foreground/50" />
              </div>
              <p className="mt-1.5 text-2xl font-bold tabular-nums">
                {kpi.value}
              </p>
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-[11px] text-muted-foreground">
                  {kpi.sub}
                </p>
                {kpi.delta !== null && kpi.delta !== undefined ? (
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      kpi.delta >= 0
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-red-500/10 text-red-600",
                    )}
                  >
                    {kpi.delta >= 0 ? (
                      <ArrowUpRightIcon className="size-3" />
                    ) : (
                      <ArrowDownRightIcon className="size-3" />
                    )}
                    {Math.abs(kpi.delta)}%
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <GrowthCard
            label="Novos clientes (7 dias)"
            value={newClients7}
            icon={UsersIcon}
          />
          <GrowthCard
            label="Novos eventos (30 dias)"
            value={newEvents30}
            icon={ImagesIcon}
          />
          <GrowthCard
            label="Fotos na semana"
            value={photosLast7}
            icon={CameraIcon}
            badge={
              weeklyGrowth !== null
                ? `${weeklyGrowth >= 0 ? "+" : ""}${weeklyGrowth}%`
                : undefined
            }
            positive={weeklyGrowth === null || weeklyGrowth >= 0}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard
            title="Fotos nos últimos 14 dias"
            footer={
              topDay.count > 0
                ? `Melhor dia: ${topDay.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} com ${topDay.count} fotos`
                : undefined
            }
          >
            <div className="flex h-44 items-end gap-1.5">
              {days.map((day) => (
                <div
                  key={day.date.toISOString()}
                  className="group flex flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {day.count}
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
          </ChartCard>

          <ChartCard title="Fotos por hora do dia">
            <div className="flex h-44 items-end gap-1">
              {hours.map((h) => (
                <div
                  key={h.hour}
                  className="group flex flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-1 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {h.count}
                  </span>
                  <div
                    className={cn(
                      "w-full rounded-t transition-colors",
                      h.hour === peakHour.hour && peakHour.count > 0
                        ? "bg-primary"
                        : "bg-primary/50",
                    )}
                    style={{
                      height: `${Math.max(
                        h.count > 0 ? (h.count / maxHour) * 100 : 2,
                        2,
                      )}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>00h</span>
              <span>06h</span>
              <span>12h</span>
              <span>18h</span>
              <span>23h</span>
            </div>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartCard title="Dia da semana">
            <div className="flex h-40 items-end gap-2">
              {weekdays.map((w) => (
                <div
                  key={w.weekday}
                  className="group flex flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-1 text-[10px] font-medium text-muted-foreground">
                    {w.count > 0 ? w.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t bg-primary/60 transition-colors group-hover:bg-primary"
                    style={{
                      height: `${Math.max(
                        w.count > 0 ? (w.count / maxWeekday) * 100 : 2,
                        2,
                      )}%`,
                    }}
                  />
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    {WEEKDAY_LABELS[w.weekday]}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>

          <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-3 font-semibold">Insights</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {insights.map((insight, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border bg-background/60 p-4 text-sm"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <insight.icon className="size-4" />
                  </span>
                  <span className="text-muted-foreground">{insight.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <RecentPhotos events={eventsList} photos={photosList} />
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

function ChartCard({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {footer ? (
          <span className="text-[11px] text-muted-foreground">{footer}</span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RecentPhotos({
  events,
  photos,
}: {
  events: { id: string; name: string }[];
  photos: {
    event_id: string;
    public_url: string;
    created_at: string;
    approved: boolean;
  }[];
}) {
  const names = new Map(events.map((e) => [e.id, e.name]));
  const recent = photos.slice(0, 8);
  if (recent.length === 0) return null;
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Fotos recentes</h2>
        <span className="text-[11px] text-muted-foreground">
          <LightbulbIcon className="mr-1 inline size-3.5" />
          Atualizado ao vivo
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {recent.map((photo) => (
          <div key={photo.public_url + photo.created_at} className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.public_url}
              alt=""
              className="aspect-[3/4] w-full rounded-lg object-cover ring-1 ring-foreground/5"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-lg bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {names.get(photo.event_id) ?? "Evento"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
