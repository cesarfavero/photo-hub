-- =============================================================
-- 0006: Admin — pessoas globais e eventos por pessoa
-- Aditiva: nao remove/recria nada de migracoes anteriores.
-- =============================================================

-- =============================================================
-- Helpers
-- =============================================================

-- Normaliza nome para agrupar a mesma pessoa entre eventos
create or replace function public.normalize_person_name(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')));
$$;

-- Conta fotos aprovadas vinculadas a um perfil (upload ou rosto)
create or replace function public.person_photo_count(p_profile_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct ph.id)::bigint
  from public.photos ph
  where ph.approved = true and ph.archived = false
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
    );
$$;

-- =============================================================
-- Plataforma/dono: pessoas agrupadas por nome normalizado
-- Admin ve todas; dono ve apenas pessoas dos seus eventos.
-- Cada linha = pessoa com lista de eventos onde apareceu
-- =============================================================

create or replace function public.get_all_people_admin()
returns table (
  person_key text,
  display_name text,
  reference_photo_url text,
  event_count bigint,
  total_photo_count bigint,
  events jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  v_is_admin := coalesce(v_is_admin, false);

  return query
  with base as (
    select
      pp.id as profile_id,
      pp.event_id,
      pp.name,
      pp.reference_photo_url,
      pp.created_at,
      public.normalize_person_name(pp.name) as person_key,
      public.person_photo_count(pp.id) as photo_count,
      e.name as event_name,
      e.slug as event_slug
    from public.participant_profiles pp
    join public.events e on e.id = pp.event_id
    where pp.status = 'active'
      and (v_is_admin or e.user_id = auth.uid())
  )
  select
    b.person_key,
    (array_agg(b.name order by b.created_at desc))[1] as display_name,
    coalesce(
      (array_agg(b.reference_photo_url) filter (where b.reference_photo_url <> ''))[1],
      ''
    ) as reference_photo_url,
    count(*)::bigint as event_count,
    sum(b.photo_count)::bigint as total_photo_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'profile_id', b.profile_id,
          'event_id', b.event_id,
          'event_name', b.event_name,
          'event_slug', b.event_slug,
          'photo_count', b.photo_count,
          'created_at', b.created_at
        ) order by b.created_at desc
      ),
      '[]'::jsonb
    ) as events
  from base b
  group by b.person_key
  order by b.person_key asc nulls last;
end;
$$;

-- =============================================================
-- Dono: eventos onde uma determinada pessoa apareceu
-- (mesmo nome normalizado; admin da plataforma ve tudo)
-- =============================================================

create or replace function public.get_person_events(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_name text;
  v_key text;
  v_is_admin boolean;
  v_result jsonb;
begin
  select name into v_name from public.participant_profiles where id = p_profile_id;
  if v_name is null or trim(v_name) = '' then
    return '[]'::jsonb;
  end if;
  v_key := public.normalize_person_name(v_name);

  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  v_is_admin := coalesce(v_is_admin, false);

  select coalesce(jsonb_agg(s.j order by (s.j->>'created_at') desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'profile_id', pp.id,
      'event_id', e.id,
      'event_name', e.name,
      'event_slug', e.slug,
      'photo_count', public.person_photo_count(pp.id),
      'created_at', pp.created_at
    ) as j
    from public.participant_profiles pp
    join public.events e on e.id = pp.event_id
    where pp.status = 'active'
      and public.normalize_person_name(pp.name) = v_key
      and (v_is_admin or e.user_id = auth.uid())
  ) s;

  return v_result;
end;
$$;

-- =============================================================
-- Grants
-- =============================================================

grant execute on function public.normalize_person_name(text) to authenticated, service_role;
grant execute on function public.person_photo_count(uuid) to authenticated, service_role;
grant execute on function public.get_all_people_admin() to authenticated;
grant execute on function public.get_person_events(uuid) to authenticated;
