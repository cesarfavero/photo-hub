-- =============================================================
-- 0005: Pipeline facial completo + RPCs admin + fixes 0004
-- Aditiva: nao remove/recria colunas de outras migracoes.
-- =============================================================

-- Fix typo do index em 0004 (se nao existir, cria)
create index if not exists detected_faces_event_idx on public.detected_faces(event_id);

-- Threshold de matching (euclidiana face-api tipico ~0.5-0.6)
-- Guardado como comentario de produto; o match roda no Node.

-- =============================================================
-- Enfileirar reanalise (dono)
-- =============================================================

create or replace function public.enqueue_reanalysis(
  p_event_id uuid,
  p_only_failed boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not public.is_event_owner(p_event_id) then
    raise exception 'permissao negada';
  end if;

  if p_only_failed then
    update public.photos
    set needs_reanalysis = true,
        analysis_status = 'pending'
    where event_id = p_event_id
      and (analysis_status = 'failed' or needs_reanalysis = true);
  else
    update public.photos
    set needs_reanalysis = true,
        analysis_status = 'pending'
    where event_id = p_event_id
      and archived = false;
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =============================================================
-- Marcar foto como analisada (service role / server)
-- =============================================================

create or replace function public.mark_photo_analyzed(
  p_photo_id uuid,
  p_status text default 'done',
  p_version integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.photos
  set analysis_status = p_status,
      analysis_version = p_version,
      analyzed_at = now(),
      needs_reanalysis = false
  where id = p_photo_id;
end;
$$;

-- =============================================================
-- Salvar deteccoes COM matching (substitui logica simplista)
-- p_faces: [{ embedding, confidence, face_index, cluster_id? }]
-- Se cluster_id vier preenchido, reutiliza; senao cria novo.
-- =============================================================

create or replace function public.save_face_detections(
  p_photo_id uuid,
  p_faces jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_f jsonb;
  v_emb float8[];
  v_conf numeric;
  v_cluster uuid;
  v_profile uuid;
  v_inserted integer := 0;
begin
  select event_id into v_event from public.photos where id = p_photo_id;
  if v_event is null then
    return 0;
  end if;

  delete from public.detected_faces where photo_id = p_photo_id;

  for v_f in select * from jsonb_array_elements(coalesce(p_faces, '[]'::jsonb))
  loop
    v_emb := array(select jsonb_array_elements_text(v_f->'embedding')::float8);
    v_conf := coalesce((v_f->>'confidence')::numeric, 0);
    v_cluster := nullif(v_f->>'cluster_id', '')::uuid;
    v_profile := nullif(v_f->>'participant_profile_id', '')::uuid;

    if v_cluster is null then
      insert into public.face_clusters (event_id, participant_profile_id, status)
      values (v_event, v_profile, case when v_profile is not null then 'linked' else 'auto' end)
      returning id into v_cluster;
    else
      if v_profile is not null then
        update public.face_clusters
        set participant_profile_id = v_profile,
            status = 'linked',
            updated_at = now()
        where id = v_cluster and event_id = v_event;
      end if;
    end if;

    insert into public.detected_faces (
      photo_id, event_id, face_index, embedding, confidence, source, cluster_id
    )
    values (
      p_photo_id, v_event,
      coalesce((v_f->>'face_index')::int, 0),
      v_emb,
      v_conf,
      coalesce(v_f->>'source', 'automatic_face_match'),
      v_cluster
    );
    v_inserted := v_inserted + 1;
  end loop;

  return v_inserted;
end;
$$;

-- =============================================================
-- Ancoras de matching: faces de perfis + clusters existentes
-- =============================================================

create or replace function public.get_event_face_anchors(p_event_id uuid)
returns table (
  cluster_id uuid,
  participant_profile_id uuid,
  embedding float8[],
  source text
)
language sql
security definer
set search_path = public
stable
as $$
  -- Faces ja detectadas com cluster (media aproximada = qualquer face do cluster)
  select distinct on (fc.id)
    fc.id as cluster_id,
    fc.participant_profile_id,
    df.embedding,
    df.source
  from public.face_clusters fc
  join public.detected_faces df on df.cluster_id = fc.id
  where fc.event_id = p_event_id
    and fc.status <> 'rejected'
    and df.manually_rejected = false
    and cardinality(df.embedding) > 0
  order by fc.id, df.created_at asc;
$$;

-- =============================================================
-- Dono: listar clusters nao identificados
-- =============================================================

create or replace function public.get_unidentified_clusters(p_event_id uuid)
returns table (
  cluster_id uuid,
  face_count bigint,
  sample_photo_url text,
  sample_face_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    fc.id as cluster_id,
    count(df.id)::bigint as face_count,
    (array_agg(ph.public_url order by df.created_at))[1] as sample_photo_url,
    (array_agg(df.id order by df.created_at))[1] as sample_face_id,
    min(fc.created_at) as created_at
  from public.face_clusters fc
  join public.detected_faces df on df.cluster_id = fc.id and df.manually_rejected = false
  join public.photos ph on ph.id = df.photo_id
  where fc.event_id = p_event_id
    and public.is_event_owner(p_event_id)
    and fc.participant_profile_id is null
    and fc.status = 'auto'
  group by fc.id
  order by face_count desc, created_at asc;
$$;

-- =============================================================
-- Dono: identificar cluster (nomeia / cria perfil)
-- =============================================================

create or replace function public.identify_cluster(
  p_cluster_id uuid,
  p_name text,
  p_profile_id uuid default null
)
returns public.participant_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_profile public.participant_profiles;
  v_sample_url text;
begin
  select event_id into v_event from public.face_clusters where id = p_cluster_id;
  if v_event is null or not public.is_event_owner(v_event) then
    raise exception 'permissao negada';
  end if;

  if p_profile_id is not null then
    select * into v_profile
    from public.participant_profiles
    where id = p_profile_id and event_id = v_event;
    if v_profile.id is null then
      raise exception 'perfil nao encontrado';
    end if;
  else
    select ph.public_url into v_sample_url
    from public.detected_faces df
    join public.photos ph on ph.id = df.photo_id
    where df.cluster_id = p_cluster_id
    order by df.created_at
    limit 1;

    insert into public.participant_profiles (event_id, name, reference_photo_url)
    values (v_event, trim(p_name), coalesce(v_sample_url, ''))
    returning * into v_profile;
  end if;

  update public.face_clusters
  set participant_profile_id = v_profile.id,
      label = v_profile.name,
      status = 'linked',
      updated_at = now()
  where id = p_cluster_id;

  return v_profile;
end;
$$;

-- =============================================================
-- Dono: rejeitar cluster
-- =============================================================

create or replace function public.reject_cluster(p_cluster_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
begin
  select event_id into v_event from public.face_clusters where id = p_cluster_id;
  if v_event is null or not public.is_event_owner(v_event) then
    raise exception 'permissao negada';
  end if;
  update public.face_clusters
  set status = 'rejected', updated_at = now()
  where id = p_cluster_id;
  update public.detected_faces
  set manually_rejected = true
  where cluster_id = p_cluster_id;
end;
$$;

-- =============================================================
-- Ao criar perfil: backfill - associa cluster da foto de ref se existir
-- =============================================================

create or replace function public.link_faces_to_profile(
  p_profile_id uuid,
  p_photo_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_count integer := 0;
begin
  select event_id into v_event from public.participant_profiles where id = p_profile_id;
  if v_event is null then return 0; end if;

  update public.face_clusters fc
  set participant_profile_id = p_profile_id,
      status = 'linked',
      updated_at = now()
  where fc.event_id = v_event
    and fc.id in (
      select df.cluster_id from public.detected_faces df
      where df.photo_id = p_photo_id and df.cluster_id is not null
    );

  update public.detected_faces
  set source = 'reference_upload'
  where photo_id = p_photo_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =============================================================
-- link_uploaded_photo por storage_path (fallback se id nao bater)
-- =============================================================

create or replace function public.link_uploaded_photo_by_path(
  p_storage_path text,
  p_token_hash text
)
returns public.participant_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photo_id uuid;
  v_profile public.participant_profiles;
begin
  select id into v_photo_id from public.photos where storage_path = p_storage_path limit 1;
  if v_photo_id is null then
    return null;
  end if;
  return public.link_uploaded_photo(v_photo_id, p_token_hash);
end;
$$;

-- =============================================================
-- Fotos pendentes de analise (server)
-- =============================================================

create or replace function public.claim_pending_photos(
  p_event_id uuid default null,
  p_limit integer default 5
)
returns setof public.photos
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.photos ph
  set analysis_status = 'processing'
  where ph.id in (
    select p.id
    from public.photos p
    where (p_event_id is null or p.event_id = p_event_id)
      and p.archived = false
      and (
        p.analysis_status = 'pending'
        or p.needs_reanalysis = true
      )
    order by p.created_at asc
    limit greatest(1, least(p_limit, 20))
    for update skip locked
  )
  returning ph.*;
end;
$$;

-- =============================================================
-- Grants
-- =============================================================

grant execute on function public.enqueue_reanalysis(uuid, boolean) to authenticated;
grant execute on function public.get_unidentified_clusters(uuid) to authenticated;
grant execute on function public.identify_cluster(uuid, text, uuid) to authenticated;
grant execute on function public.reject_cluster(uuid) to authenticated;
grant execute on function public.link_uploaded_photo_by_path(text, text) to anon, authenticated;

-- mark/save/claim/anchors: preferencialmente service role; authenticated para owner tools
grant execute on function public.mark_photo_analyzed(uuid, text, integer) to authenticated, service_role;
grant execute on function public.save_face_detections(uuid, jsonb) to authenticated, service_role;
grant execute on function public.get_event_face_anchors(uuid) to authenticated, service_role;
grant execute on function public.claim_pending_photos(uuid, integer) to authenticated, service_role;
grant execute on function public.link_faces_to_profile(uuid, uuid) to authenticated, service_role;
