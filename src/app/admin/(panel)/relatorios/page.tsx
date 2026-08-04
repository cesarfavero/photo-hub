import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ActivityIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  CameraIcon,
  CheckCheckIcon,
  ClockIcon,
  FlameIcon,
  UsersIcon,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { CsvExport } from "@/components/admin/csv-export";
import { createClient } from "@/lib/supabase/server";
import {
  bestDay,
  bestHour,
  filterPeriod,
  hourlyDistribution,
  periodDelta,
  photosPerDay,
  trend,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Relatórios · Photo Hub",
};

const PERIODS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "all", label: "Tudo" },
];

type Row = {
  id: string;
  name: string;
  slug: string;
  user_id: string | null;
  active: boolean;
  created_at: string;
};

type PhotoRow = {
  event_id: string;
  frame_id: string | null;
  author_name: string | null;
  approved: boolean;
  archived: boolean;
  created_at: string;
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const days =
    periodo === "7"
      ? 7
      : periodo === "30"
        ? 30
        : periodo === "90"
          ? 90
          : null;

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
      supabase
        .from("events")
        .select("id, name, slug, user_id, active, created_at"),
      supabase
        .from("photos")
        .select(
          "event_id, frame_id, author_name, approved, archived, created_at",
        ),
    ]);

  const allEvents = (events ?? []) as Row[];
  const allPhotos = (photos ?? []) as PhotoRow[];
  const allProfiles = (profiles ?? []).filter((p) => !p.is_admin);

  const clients = filterPeriod(allProfiles, days);
  const eventsInPeriod = filterPeriod(allEvents, days);
  const photosInPeriod = filterPeriod(allPhotos, days);

  const approved = photosInPeriod.filter((p) => p.approved && !p.archived);
  const pending = photosInPeriod.filter((p) => !p.approved && !p.archived);
  const guests = new Set(
    photosInPeriod.map((p) => p.author_name).filter((n): n is string => !!n),
  ).size;

  const deltaClients = periodDelta(allProfiles, days);
  const deltaEvents = periodDelta(allEvents, days);
  const deltaPhotos = periodDelta(allPhotos, days);
  const deltaApproved = periodDelta(
    allPhotos.filter((p) => p.approved && !p.archived),
    days,
  );

  const approvalRate = photosInPeriod.length
    ? Math.round((approved.length / photosInPeriod.length) * 100)
    : 0;

  const kpis = [
    {
      label: "Clientes",
      value: clients.length,
      sub: `${deltaClients.current} no período`,
      icon: UsersIcon,
      delta: deltaClients.pct,
    },
    {
      label: "Eventos",
      value: eventsInPeriod.length,
      sub: `${deltaEvents.current} no período`,
      icon: CalendarIcon,
      delta: deltaEvents.pct,
    },
    {
      label: "Fotos",
      value: photosInPeriod.length,
      sub: `${deltaPhotos.current} no período`,
      icon: CameraIcon,
      delta: deltaPhotos.pct,
    },
    {
      label: "Publicadas",
      value: approved.length,
      sub: `${approvalRate}% de aprovação`,
      icon: CheckCheckIcon,
      delta: deltaApproved.pct,
    },
    {
      label: "Pendentes",
      value: pending.length,
      sub: "aguardando aprovação",
      icon: ClockIcon,
      delta: null,
    },
    {
      label: "Convidados",
      value: guests,
      sub: "publicaram com nome",
      icon: UsersIcon,
      delta: null,
    },
  ];

  const points = trend(photosInPeriod, days);
  const maxPoint = Math.max(1, ...points.map((p) => p.value));

  const photosByEvent = new Map<string, number>();
  for (const photo of photosInPeriod) {
    photosByEvent.set(
      photo.event_id,
      (photosByEvent.get(photo.event_id) ?? 0) + 1,
    );
  }
  const topEvents = [...photosByEvent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxEvent = Math.max(1, ...topEvents.map(([, c]) => c));
  const eventNames = new Map(allEvents.map((e) => [e.id, e.name]));

  const photosByClient = new Map<string, number>();
  const eventsByClient = new Map<string, number>();
  for (const event of allEvents) {
    eventsByClient.set(
      event.user_id ?? "",
      (eventsByClient.get(event.user_id ?? "") ?? 0) + 1,
    );
  }
  for (const eventId of photosByEvent.keys()) {
    const event = allEvents.find((e) => e.id === eventId);
    if (!event) continue;
    const count = photosByEvent.get(eventId) ?? 0;
    photosByClient.set(
      event.user_id ?? "",
      (photosByClient.get(event.user_id ?? "") ?? 0) + count,
    );
  }
  const clientEmails = new Map(allProfiles.map((c) => [c.id, c.email]));
  const topClients = [...photosByClient.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxClient = Math.max(1, ...topClients.map(([, c]) => c));

  const hours = hourlyDistribution(photosInPeriod);
  const peakHour = bestHour(hours);
  const bestDayInPeriod = bestDay(photosPerDay(photosInPeriod, days ?? 365));
  const topEvent = topEvents[0];

  const insights: { icon: typeof ActivityIcon; text: string }[] = [
    {
      icon: ActivityIcon,
      text:
        deltaPhotos.pct === null
          ? "Sem período anterior para comparar o volume de fotos."
          : `O volume de fotos ${
              deltaPhotos.pct >= 0 ? "cresceu" : "caiu"
            } ${Math.abs(deltaPhotos.pct)}% no período em relação ao anterior.`,
    },
    {
      icon: FlameIcon,
      text:
        bestDayInPeriod.count > 0
          ? `O dia mais movimentado foi ${bestDayInPeriod.date.toLocaleDateString(
              "pt-BR",
              { day: "2-digit", month: "long" },
            )} com ${bestDayInPeriod.count} fotos.`
          : "Nenhuma foto no período para calcular o melhor dia.",
    },
    {
      icon: ClockIcon,
      text:
        peakHour.count > 0
          ? `O pico de fotos acontece às ${peakHour.hour}h — reforço da cabine nesse horário rende mais.`
          : "Ainda sem fotos para identificar o pico de horário.",
    },
    {
      icon: FlameIcon,
      text:
        topEvent && topEvent[1] > 0
          ? `O evento ${eventNames.get(topEvent[0]) ?? "sem nome"} lidera com ${topEvent[1]} fotos no período.`
          : "Nenhum evento com fotos no período.",
    },
  ];

  const eventRows = allEvents
    .map((event) => {
      const count = photosByEvent.get(event.id) ?? 0;
      const evPhotos = allPhotos.filter((p) => p.event_id === event.id);
      const evApproved = evPhotos.filter(
        (p) => p.approved && !p.archived,
      ).length;
      const evPending = evPhotos.filter((p) => !p.approved && !p.archived).length;
      const lastPhoto = evPhotos
        .map((p) => p.created_at)
        .sort()
        .at(-1);
      return {
        id: event.id,
        name: event.name,
        slug: event.slug,
        client: clientEmails.get(event.user_id ?? "") ?? "—",
        photos: count,
        approved: evApproved,
        pending: evPending,
        rate: evPhotos.length
          ? Math.round((evApproved / evPhotos.length) * 100)
          : 0,
        lastPhoto: lastPhoto
          ? new Date(lastPhoto).toLocaleDateString("pt-BR")
          : "—",
        active: event.active,
      };
    })
    .sort((a, b) => b.photos - a.photos);

  const clientRows = allProfiles
    .map((client) => {
      const clientEvents = allEvents.filter(
        (e) => e.user_id === client.id,
      );
      const eventIds = new Set(clientEvents.map((e) => e.id));
      const clientPhotos = allPhotos.filter((p) => eventIds.has(p.event_id));
      const clientApproved = clientPhotos.filter(
        (p) => p.approved && !p.archived,
      ).length;
      return {
        id: client.id,
        email: client.email,
        active: client.active,
        events: clientEvents.length,
        photos: clientPhotos.length,
        approved: clientApproved,
        pending: clientPhotos.length - clientApproved,
        rate: clientPhotos.length
          ? Math.round((clientApproved / clientPhotos.length) * 100)
          : 0,
        created: new Date(client.created_at).toLocaleDateString("pt-BR"),
      };
    })
    .sort((a, b) => b.photos - a.photos);

  const periodLabel = days ? `últimos ${days} dias` : "todo o período";

  return (
    <>
      <AdminHeader
        title="Relatórios"
        subtitle={`Desempenho da plataforma no período: ${periodLabel}.`}
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-full border bg-card p-1 shadow-sm">
          {PERIODS.map((period) => {
            const selected =
              days === null
                ? period.value === "all"
                : period.value === String(days);
            return (
              <Link
                key={period.value}
                href={`/admin/relatorios?periodo=${period.value}`}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {period.label}
              </Link>
            );
          })}
        </div>
        <div className="flex gap-2">
          <CsvExport
            filename={`relatorio-eventos-${periodo ?? "all"}.csv`}
            headers={[
              "Evento",
              "Cliente",
              "Fotos",
              "Publicadas",
              "Pendentes",
              "Taxa (%)",
              "Última foto",
              "Status",
            ]}
            rows={eventRows.map((r) => [
              r.name,
              r.client,
              r.photos,
              r.approved,
              r.pending,
              r.rate,
              r.lastPhoto,
              r.active ? "Ativo" : "Desativado",
            ])}
            label="Eventos CSV"
          />
          <CsvExport
            filename={`relatorio-clientes-${periodo ?? "all"}.csv`}
            headers={[
              "Cliente",
              "Eventos",
              "Fotos",
              "Publicadas",
              "Pendentes",
              "Taxa (%)",
              "Cliente desde",
              "Status",
            ]}
            rows={clientRows.map((r) => [
              r.email,
              r.events,
              r.photos,
              r.approved,
              r.pending,
              r.rate,
              r.created,
              r.active ? "Ativo" : "Bloqueado",
            ])}
            label="Clientes CSV"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <kpi.icon className="size-4 text-foreground/50" />
              </div>
              <p className="mt-1.5 text-2xl font-bold tabular-nums">{kpi.value}</p>
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-[11px] text-muted-foreground">
                  {kpi.sub}
                </p>
                {kpi.delta !== null ? (
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

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Evolução de fotos · {periodLabel}</h2>
            <span className="text-sm text-muted-foreground">
              {photosInPeriod.length} fotos
            </span>
          </div>
          <div className="mt-4 flex h-48 items-end gap-1">
            {points.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem fotos no período.</p>
            ) : (
              points.map((point) => (
                <div
                  key={point.label + point.value}
                  className="group flex flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[9px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {point.value}
                  </span>
                  <div
                    className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                    style={{
                      height: `${Math.max(
                        point.value > 0 ? (point.value / maxPoint) * 100 : 2,
                        2,
                      )}%`,
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground">
                    {point.label}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Fotos por evento</h2>
            {topEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem fotos no período.</p>
            ) : (
              <ul className="space-y-3">
                {topEvents.map(([eventId, count]) => (
                  <li key={eventId} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="truncate pr-2 font-medium">
                        {eventNames.get(eventId) ?? "Evento"}
                      </span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(count / maxEvent) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Fotos por cliente</h2>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem fotos no período.</p>
            ) : (
              <ul className="space-y-3">
                {topClients.map(([clientId, count]) => (
                  <li key={clientId} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="truncate pr-2 font-medium">
                        {clientEmails.get(clientId) ?? "Cliente"}
                      </span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(count / maxClient) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ReportTable
            title="Desempenho por evento"
            subtitle="Fotos, aprovação e última atividade."
            headers={["Evento", "Cliente", "Fotos", "Publ.", "Pend.", "Taxa", "Última"]}
            rows={eventRows.map((r) => [
              r.name,
              r.client,
              String(r.photos),
              String(r.approved),
              String(r.pending),
              `${r.rate}%`,
              r.lastPhoto,
            ])}
          />
          <ReportTable
            title="Desempenho por cliente"
            subtitle="Eventos, fotos e taxa de aprovação."
            headers={["Cliente", "Eventos", "Fotos", "Publ.", "Pend.", "Taxa"]}
            rows={clientRows.map((r) => [
              r.email,
              String(r.events),
              String(r.photos),
              String(r.approved),
              String(r.pending),
              `${r.rate}%`,
            ])}
          />
        </div>
      </div>
    </>
  );
}

function ReportTable({
  title,
  subtitle,
  headers,
  rows,
}: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              {headers.map((h) => (
                <th key={h} className="px-5 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/60 last:border-0 hover:bg-muted/30"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "max-w-52 truncate px-5 py-2.5",
                      j === 0 && "font-medium",
                      j === 4 ? "tabular-nums" : "",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
