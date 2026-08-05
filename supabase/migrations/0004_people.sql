-- =============================================================
-- 0004: Galeria por pessoa — perfis de participantes, detecção
-- facial e vinculação por dispositivo.
-- Aditiva: não remove/recria nada de migrações anteriores.
-- =============================================================

-- Extensão pgvector para embeddings faciais
-- create extension if not exists vector;

-- ---------- Perfis de participantes ----------
create table if not exists public.participant_profiles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  reference_photo_url text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists participant_profiles_event_idx on public.participant_profiles(event_id, created_at desc);

-- ---------- Identidades por dispositivo ----------
create table if not exists public.device_identities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  device_token_hash text not null,
  participant_profile_id uuid references public.participant_profiles(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, device_token_hash)
);
create index if not exists device_identities_event_idx on public.device_identities(event_id, last_seen_at desc);
create index if not exists device_identities_profile_idx on public.device_identities(participant_profile_id);

-- ---------- Colunas de análise em photos (aditivo) ----------
alter table public.photos
  add column if not exists uploaded_by_profile_id uuid references public.participant_profiles(id) on delete set null,
  add column if not exists analysis_status text not null default 'pending',
  add column if not exists analysis_version integer,
  add column if not exists analyzed_at timestamptz,
  add column if not exists needs_reanalysis boolean not null default false;

create index if not exists photos_uploaded_by_idx on public.photos(uploaded_by_profile_id);
create index if not exists photos_analysis_status_idx on public.photos(event_id, analysis_status);

-- ---------- Clusters de rostos (pessoas candidatas) ----------
create table if not exists public.face_clusters (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text,
  participant_profile_id uuid references public.participant_profiles(id) on delete set null,
  status text not null default 'auto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists face_clusters_event_idx on public.face_clusters(event_id, status);
create index if not exists face_clusters_profile_idx on public.face_clusters(participant_profile_id);

-- ---------- Rostos detectados ----------
create table if not exists public.detected_faces (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  face_index integer not null default 0,
  -- embedding: vetor de 128 dimensões (face-api.js)
  -- usar numeric[] se pgvector não estiver disponível, ou vector(128) se estiver
  -- Para compatibilidade máxima, usamos um array de floats
  embedding float8[] not null default '{}',
  confidence numeric not null default 0,
  source text not null default 'automatic_face_match',
  cluster_id uuid references public.face_clusters(id) on delete set null,
  manually_rejected boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists detected_faces_photo_idx on public.detected_faces(photo_id);
create index if not exists detected_faces_event_idx on public.detected_faces(event_id);
create index if not exists detected_faces_cluster_idx on public.detected_faces(cluster_id);

-- ---------- RLS ----------
alter table public.participant_profiles enable row level security;
alter table public.device_identities enable row level security;
alter table public.face_clusters enable row level security;
alter table public.detected_faces enable row level security;

create or replace function public.is_event_owner(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.user_id = auth.uid()
  );
$$;

-- Políticas para participant_profiles: público pode ler, dono pode tudo
create policy "participant_profiles: select public" on public.participant_profiles
  for select using (true);
create policy "participant_profiles: manage owner" on public.participant_profiles
  for all to authenticated using (public.is_event_owner(event_id));

-- Políticas para device_identities: acesso via funções RPC apenas
create policy "device_identities: deny direct" on public.device_identities
  for all using (false);

-- Políticas para face_clusters: acesso via funções RPC
create policy "face_clusters: select public" on public.face_clusters
  for select using (true);
create policy "face_clusters: manage owner" on public.face_clusters
  for all to authenticated using (public.is_event_owner(event_id));

-- Políticas para detected_faces: acesso via funções RPC
create policy "detected_faces: deny direct" on public.detected_faces
  for all using (false);

-- =============================================================
-- Identidade de dispositivo + perfil (público)
-- =============================================================

create or replace function public.get_or_create_device_identity(p_event_id uuid, p_token_hash text)
returns public.device_identities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dev public.device_identities;
begin
  select * into v_dev
  from public.device_identities
  where event_id = p_event_id and device_token_hash = p_token_hash
  limit 1;

  if v_dev.id is null then
    insert into public.device_identities (event_id, device_token_hash)
    values (p_event_id, p_token_hash)
    returning * into v_dev;
  else
    update public.device_identities
    set last_seen_at = now()
    where id = v_dev.id;
    select * into v_dev from public.device_identities where id = v_dev.id;
  end if;

  return v_dev;
end;
$$;

create or replace function public.create_participant_profile(
  p_event_id uuid,
  p_token_hash text,
  p_name text,
  p_reference_photo_url text default ''
)
returns public.participant_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.participant_profiles;
  v_dev public.device_identities;
begin
  -- Verifica se já existe perfil para este dispositivo
  select * into v_dev
  from public.device_identities
  where event_id = p_event_id and device_token_hash = p_token_hash
  limit 1;

  if v_dev.participant_profile_id is not null then
    select * into v_profile from public.participant_profiles where id = v_dev.participant_profile_id;
    return v_profile;
  end if;

  -- Cria novo perfil
  insert into public.participant_profiles (event_id, name, reference_photo_url)
  values (p_event_id, trim(p_name), p_reference_photo_url)
  returning * into v_profile;

  -- Vincula dispositivo ao perfil
  if v_dev.id is not null then
    update public.device_identities
    set participant_profile_id = v_profile.id, last_seen_at = now()
    where id = v_dev.id;
  else
    insert into public.device_identities (event_id, device_token_hash, participant_profile_id)
    values (p_event_id, p_token_hash, v_profile.id);
  end if;

  return v_profile;
end;
$$;

create or replace function public.get_device_profile(p_event_id uuid, p_token_hash text)
returns public.participant_profiles
language sql
security definer
set search_path = public
stable
as $$
  select pp.*
  from public.device_identities di
  join public.participant_profiles pp on pp.id = di.participant_profile_id
  where di.event_id = p_event_id and di.device_token_hash = p_token_hash
  limit 1;
$$;

-- =============================================================
-- Upload: vincula foto ao perfil do dispositivo
-- =============================================================

create or replace function public.link_uploaded_photo(p_photo_id uuid, p_token_hash text)
returns public.participant_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_dev public.device_identities;
  v_profile public.participant_profiles;
begin
  select event_id into v_event from public.photos where id = p_photo_id;
  if v_event is null then
    return null;
  end if;

  select * into v_dev
  from public.device_identities
  where event_id = v_event and device_token_hash = p_token_hash
  limit 1;

  if v_dev.participant_profile_id is not null then
    update public.photos
    set uploaded_by_profile_id = v_dev.participant_profile_id
    where id = p_photo_id;
    
    select * into v_profile from public.participant_profiles where id = v_dev.participant_profile_id;
  end if;

  return v_profile;
end;
$$;

-- =============================================================
-- Público: pessoas e fotos por pessoa
-- =============================================================

create or replace function public.get_event_people(p_event_id uuid)
returns table (
  id uuid,
  name text,
  reference_photo_url text,
  photo_count bigint,
  last_photo_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    pp.id,
    pp.name,
    pp.reference_photo_url,
    count(distinct ph.id)::bigint as photo_count,
    max(ph.created_at) as last_photo_at
  from public.participant_profiles pp
  join public.events e on e.id = pp.event_id and e.active = true
  left join public.photos ph on ph.event_id = pp.event_id 
    and ph.approved = true and ph.archived = false
    and (
      ph.uploaded_by_profile_id = pp.id
      or exists (
        select 1
        from public.detected_faces df
        join public.face_clusters fc on fc.id = df.cluster_id
        where df.photo_id = ph.id 
          and fc.participant_profile_id = pp.id 
          and df.manually_rejected = false
          and fc.status <> 'rejected'
      )
    )
  where pp.event_id = p_event_id
    and pp.status = 'active'
  group by pp.id, pp.name, pp.reference_photo_url
  order by last_photo_at desc nulls last;
$$;

create or replace function public.get_person_photos(p_event_id uuid, p_profile_id uuid)
returns setof public.photos
language sql
security definer
set search_path = public
stable
as $$
  select distinct ph.*
  from public.photos ph
  join public.events e on e.id = ph.event_id and e.active = true
  where ph.event_id = p_event_id
    and ph.approved = true and ph.archived = false
    and (
      ph.uploaded_by_profile_id = p_profile_id
      or exists (
        select 1
        from public.detected_faces df
        join public.face_clusters fc on fc.id = df.cluster_id
        where df.photo_id = ph.id 
          and fc.participant_profile_id = p_profile_id 
          and df.manually_rejected = false
          and fc.status <> 'rejected'
      )
    )
  order by ph.created_at desc;
$$;

-- =============================================================
-- Dono do evento: gestão de pessoas e rostos
-- =============================================================

create or replace function public.get_event_people_admin(p_event_id uuid)
returns table (
  id uuid,
  name text,
  reference_photo_url text,
  photo_count bigint,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    pp.id,
    pp.name,
    pp.reference_photo_url,
    count(distinct ph.id)::bigint as photo_count,
    pp.created_at
  from public.participant_profiles pp
  left join public.photos ph on ph.event_id = pp.event_id 
    and ph.approved = true and ph.archived = false
    and (
      ph.uploaded_by_profile_id = pp.id
      or exists (
        select 1
        from public.detected_faces df
        join public.face_clusters fc on fc.id = df.cluster_id
        where df.photo_id = ph.id and fc.participant_profile_id = pp.id and df.manually_rejected = false
      )
    )
  where pp.event_id = p_event_id
    and public.is_event_owner(p_event_id)
  group by pp.id, pp.name, pp.reference_photo_url, pp.created_at
  order by pp.created_at;
$$;

create or replace function public.rename_profile(p_profile_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
begin
  select event_id into v_event from public.participant_profiles where id = p_profile_id;
  if v_event is null or not public.is_event_owner(v_event) then
    raise exception 'permissao negada';
  end if;
  update public.participant_profiles
  set name = trim(p_name), updated_at = now()
  where id = p_profile_id;
end;
$$;

create or replace function public.merge_profiles(p_from_profile_id uuid, p_to_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
begin
  select event_id into v_event from public.participant_profiles where id = p_from_profile_id;
  if v_event is null or not public.is_event_owner(v_event) then
    raise exception 'permissao negada';
  end if;
  update public.face_clusters
  set participant_profile_id = p_to_profile_id, updated_at = now()
  where participant_profile_id = p_from_profile_id;
  update public.photos
  set uploaded_by_profile_id = p_to_profile_id
  where uploaded_by_profile_id = p_from_profile_id;
  update public.device_identities
  set participant_profile_id = p_to_profile_id
  where participant_profile_id = p_from_profile_id;
  delete from public.participant_profiles where id = p_from_profile_id;
end;
$$;

-- =============================================================
-- Salvar detecções de rostos (chamado pela API server-side)
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
  v_inserted integer := 0;
begin
  select event_id into v_event from public.photos where id = p_photo_id;
  if v_event is null then
    return 0;
  end if;

  -- Limpa detecções anteriores desta foto
  delete from public.detected_faces where photo_id = p_photo_id;

  for v_f in select * from jsonb_array_elements(coalesce(p_faces, '[]'::jsonb))
  loop
    v_emb := array(select jsonb_array_elements_text(v_f->'embedding')::float8);
    v_conf := coalesce((v_f->>'confidence')::numeric, 0);
    v_cluster := null;

    -- Tenta encontrar cluster existente por similaridade (cosine similarity)
    -- Regra: se embedding muito similar a um rosto de um cluster com perfil, usa esse cluster
    -- Para MVP, simplificamos: cada rosto novo cria um cluster próprio
    -- O admin pode mesclar depois
    insert into public.face_clusters (event_id, status)
    values (v_event, 'auto')
    returning id into v_cluster;

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

  -- Para o perfil recém-criado, tenta vincular faces existentes do evento
  -- comparando embedding da foto de referência com faces já detectadas
  -- Esta função é chamada após criar perfil para encontrar fotos antigas
  
  -- Simplificação para MVP: marca todas as faces da foto como vinculadas ao perfil
  -- (pois a foto de referência foi tirada pela pessoa)
  update public.detected_faces
  set source = 'reference_upload'
  where photo_id = p_photo_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =============================================================
-- Grants
-- =============================================================

grant execute on function public.get_or_create_device_identity(uuid, text) to anon, authenticated;
grant execute on function public.create_participant_profile(uuid, text, text, text) to anon, authenticated;
grant execute on function public.get_device_profile(uuid, text) to anon, authenticated;
grant execute on function public.link_uploaded_photo(uuid, text) to anon, authenticated;
grant execute on function public.get_event_people(uuid) to anon, authenticated;
grant execute on function public.get_person_photos(uuid, uuid) to anon, authenticated;

grant execute on function public.get_event_people_admin(uuid) to authenticated;
grant execute on function public.rename_profile(uuid, text) to authenticated;
grant execute on function public.merge_profiles(uuid, uuid) to authenticated;
grant execute on function public.save_face_detections(uuid, jsonb) to authenticated;
grant execute on function public.link_faces_to_profile(uuid, uuid) to authenticated;
