"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  EyeIcon,
  LoaderCircleIcon,
  MergeIcon,
  RefreshCwIcon,
  UserRoundIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type {
  EventPerson,
  PersonEventEntry,
  Photo,
  UnidentifiedCluster,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function PeopleManager({ eventId }: { eventId: string }) {
  const [people, setPeople] = useState<EventPerson[]>([]);
  const [clusters, setClusters] = useState<UnidentifiedCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [identifyCluster, setIdentifyCluster] =
    useState<UnidentifiedCluster | null>(null);
  const [identifyName, setIdentifyName] = useState("");
  const [mergeFrom, setMergeFrom] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [detailPerson, setDetailPerson] = useState<EventPerson | null>(null);
  const [detailPhotos, setDetailPhotos] = useState<Photo[]>([]);
  const [detailEvents, setDetailEvents] = useState<PersonEventEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [peopleRes, clustersRes] = await Promise.all([
      supabase.rpc("get_event_people_admin", { p_event_id: eventId }),
      supabase.rpc("get_unidentified_clusters", { p_event_id: eventId }),
    ]);
    return {
      people: (peopleRes.data as EventPerson[]) ?? [],
      clusters: (clustersRes.data as UnidentifiedCluster[]) ?? [],
    };
  }, [eventId]);

  const load = useCallback(async () => {
    const data = await fetchData();
    setPeople(data.people);
    setClusters(data.clusters);
    setLoading(false);
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await fetchData();
      if (active) {
        setPeople(data.people);
        setClusters(data.clusters);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const reanalyze = async (onlyFailed: boolean) => {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("enqueue_reanalysis", {
      p_event_id: eventId,
      p_only_failed: onlyFailed,
    });
    if (error) {
      toast.error("Não foi possível enfileirar", {
        description: error.message,
      });
      setBusy(false);
      return;
    }

    // Dispara o worker
    try {
      await fetch(
        `/api/analysis/process?eventId=${encodeURIComponent(eventId)}&limit=5`,
        { method: "GET" },
      );
    } catch {
      /* ignore */
    }

    toast.success("Reanálise enfileirada", {
      description: `${data ?? 0} foto(s) marcadas. O processamento roda em background.`,
    });
    setBusy(false);
    void load();
  };

  const submitIdentify = async () => {
    if (!identifyCluster || !identifyName.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("identify_cluster", {
      p_cluster_id: identifyCluster.cluster_id,
      p_name: identifyName.trim(),
      p_profile_id: null,
    });
    setBusy(false);
    if (error) {
      toast.error("Falha ao identificar", { description: error.message });
      return;
    }
    toast.success("Pessoa identificada!");
    setIdentifyCluster(null);
    setIdentifyName("");
    void load();
  };

  const rejectCluster = async (clusterId: string) => {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("reject_cluster", {
      p_cluster_id: clusterId,
    });
    setBusy(false);
    if (error) {
      toast.error("Falha ao rejeitar", { description: error.message });
      return;
    }
    toast.success("Cluster rejeitado");
    void load();
  };

  const submitRename = async () => {
    if (!renameId || !renameValue.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("rename_profile", {
      p_profile_id: renameId,
      p_name: renameValue.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error("Falha ao renomear", { description: error.message });
      return;
    }
    toast.success("Nome atualizado");
    setRenameId(null);
    void load();
  };

  const submitMerge = async (toId: string) => {
    if (!mergeFrom || mergeFrom === toId) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("merge_profiles", {
      p_from_profile_id: mergeFrom,
      p_to_profile_id: toId,
    });
    setBusy(false);
    if (error) {
      toast.error("Falha ao mesclar", { description: error.message });
      return;
    }
    toast.success("Perfis mesclados");
    setMergeFrom(null);
    void load();
  };

  const openDetail = async (person: EventPerson) => {
    setDetailPerson(person);
    setDetailPhotos([]);
    setDetailEvents([]);
    setDetailLoading(true);
    const supabase = createClient();
    const [photosRes, eventsRes] = await Promise.all([
      supabase.rpc("get_person_photos", {
        p_event_id: eventId,
        p_profile_id: person.id,
      }),
      supabase.rpc("get_person_events", { p_profile_id: person.id }),
    ]);
    setDetailPhotos((photosRes.data as Photo[]) ?? []);
    setDetailEvents((eventsRes.data as PersonEventEntry[]) ?? []);
    setDetailLoading(false);
  };

  return (
    <section className="rounded-2xl border bg-card/60 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <UsersIcon className="size-4" /> Pessoas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Perfis criados pelos convidados, rostos não identificados e
            reanálise facial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void reanalyze(true)}
          >
            {busy ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <RefreshCwIcon />
            )}
            Reanalisar falhas
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void reanalyze(false)}
          >
            <RefreshCwIcon /> Reanalisar todas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => void load()}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="mb-3 text-sm font-medium">
              Perfis ({people.length})
            </h3>
            {people.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum perfil criado ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {people.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5",
                      mergeFrom === p.id && "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="size-10 shrink-0 overflow-hidden rounded-full bg-muted">
                        {p.reference_photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.reference_photo_url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <UserRoundIcon className="size-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(p.photo_count)}{" "}
                          {Number(p.photo_count) === 1 ? "foto" : "fotos"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void openDetail(p)}
                      >
                        <EyeIcon /> Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRenameId(p.id);
                          setRenameValue(p.name);
                        }}
                      >
                        Renomear
                      </Button>
                      {mergeFrom === p.id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMergeFrom(null)}
                        >
                          Cancelar
                        </Button>
                      ) : mergeFrom ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void submitMerge(p.id)}
                          disabled={busy}
                        >
                          <MergeIcon /> Mesclar aqui
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMergeFrom(p.id)}
                        >
                          <MergeIcon /> Mesclar
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {mergeFrom ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Selecione o perfil de destino para mesclar.
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">
              Não identificados ({clusters.length})
            </h3>
            {clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum rosto pendente de identificação. Rode a reanálise se
                houver fotos novas.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clusters.map((c) => (
                  <li
                    key={c.cluster_id}
                    className="overflow-hidden rounded-xl border bg-background/60"
                  >
                    <div className="aspect-square bg-muted">
                      {c.sample_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.sample_photo_url}
                          alt="Rosto não identificado"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="space-y-2 p-3">
                      <p className="text-xs text-muted-foreground">
                        {Number(c.face_count)}{" "}
                        {Number(c.face_count) === 1
                          ? "ocorrência"
                          : "ocorrências"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setIdentifyCluster(c);
                            setIdentifyName("");
                          }}
                        >
                          Identificar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void rejectCluster(c.cluster_id)}
                          disabled={busy}
                          aria-label="Rejeitar"
                        >
                          <XIcon />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={!!identifyCluster}
        onOpenChange={(open) => {
          if (!open) setIdentifyCluster(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Identificar pessoa</DialogTitle>
            <DialogDescription>
              Informe o nome. Só o dono do evento pode identificar rostos.
            </DialogDescription>
          </DialogHeader>
          {identifyCluster?.sample_photo_url ? (
            <div className="mx-auto size-24 overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={identifyCluster.sample_photo_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="identify-name">Nome</Label>
            <Input
              id="identify-name"
              value={identifyName}
              onChange={(e) => setIdentifyName(e.target.value)}
              placeholder="Ex.: João Silva"
              maxLength={60}
            />
          </div>
          <Button
            onClick={() => void submitIdentify()}
            disabled={!identifyName.trim() || busy}
          >
            {busy ? <LoaderCircleIcon className="animate-spin" /> : null}
            Salvar
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!detailPerson}
        onOpenChange={(open) => {
          if (!open) setDetailPerson(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailPerson?.name}</DialogTitle>
            <DialogDescription>
              Fotos deste evento e eventos onde esta pessoa apareceu.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Fotos neste evento ({detailPhotos.length})
                </h4>
                {detailPhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma foto vinculada a esta pessoa neste evento.
                  </p>
                ) : (
                  <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                    {detailPhotos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-[3/4] overflow-hidden rounded-lg bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.public_url}
                          alt={detailPerson?.name ?? "Foto"}
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Eventos ({detailEvents.length})
                </h4>
                {detailEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum outro evento com esta pessoa.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {detailEvents.map((event) => (
                      <li key={event.profile_id + event.event_id}>
                        <Link
                          href={`/admin/events/${event.event_id}`}
                          className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted"
                        >
                          <CalendarDaysIcon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
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
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameId}
        onOpenChange={(open) => {
          if (!open) setRenameId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear perfil</DialogTitle>
            <DialogDescription>
              Altera o nome exibido na galeria por pessoa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-name">Nome</Label>
            <Input
              id="rename-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={60}
            />
          </div>
          <Button
            onClick={() => void submitRename()}
            disabled={!renameValue.trim() || busy}
          >
            Salvar
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
