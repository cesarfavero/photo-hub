-- 0001: ownership de eventos (dono = usuário autenticado)

alter table events
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- backfill: atribui os eventos existentes ao primeiro usuário do projeto
update events
set user_id = (
  select id from auth.users order by created_at asc limit 1
)
where user_id is null;

-- RLS: cada usuário só vê/edita os próprios eventos
alter table events enable row level security;

drop policy if exists "events_own_select" on events;
create policy "events_own_select" on events
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "events_own_insert" on events;
create policy "events_own_insert" on events
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "events_own_update" on events;
create policy "events_own_update" on events
  for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "events_own_delete" on events;
create policy "events_own_delete" on events
  for delete to authenticated
  using (auth.uid() = user_id);

-- público: só lê eventos ativos (página da cabine, galeria e sitemap)
drop policy if exists "events_public_read" on events;
create policy "events_public_read" on events
  for select to anon
  using (active = true);
