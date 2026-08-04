-- =============================================================
-- Photo Hub - Schema
-- Rode este script no SQL Editor do Supabase (Dashboard > SQL)
-- =============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ---------- Tabela: events ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text default '',
  cover_url text default '',
  active boolean not null default true,
  theme_color text not null default '#171717',
  icon text not null default '🎉',
  created_at timestamptz not null default now()
);

-- ---------- Tabela: frames (molduras) ----------
create table if not exists public.frames (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Tabela: photos ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  frame_id uuid references public.frames(id) on delete set null,
  storage_path text not null,
  public_url text not null,
  author_name text,
  approved boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists photos_event_idx on public.photos(event_id, created_at desc);
create index if not exists frames_event_idx on public.frames(event_id, sort_order asc);

-- Realtime: novas fotos aparecem na galeria ao vivo
alter publication supabase_realtime add table public.photos;

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.events enable row level security;
alter table public.frames enable row level security;
alter table public.photos enable row level security;

-- O dono do evento é quem autentica (Auth) e criou o registro.
-- events
create policy "events: select public" on public.events for select using (true);
create policy "events: insert authed" on public.events for insert with check (auth.uid() is not null);
create policy "events: update owner" on public.events for update using (auth.uid() is not null);
create policy "events: delete owner" on public.events for delete using (auth.uid() is not null);

-- frames (público pode ver para tirar foto; admin gerencia)
create policy "frames: select public" on public.frames for select using (true);
create policy "frames: insert authed" on public.frames for insert with check (auth.uid() is not null);
create policy "frames: update authed" on public.frames for update using (auth.uid() is not null);
create policy "frames: delete authed" on public.frames for delete using (auth.uid() is not null);

-- photos (qualquer pessoa pode inserir sua foto; admin gerencia/aprova)
create policy "photos: select approved" on public.photos for select using (approved = true or auth.uid() is not null);
create policy "photos: insert anon" on public.photos for insert with check (true);
create policy "photos: update authed" on public.photos for update using (auth.uid() is not null);
create policy "photos: delete authed" on public.photos for delete using (auth.uid() is not null);

-- =============================================================
-- Buckets de storage
-- Rode no Dashboard > Storage > New bucket (public):
--   - photos   (público, guarda as fotos tiradas)
--   - frames   (público, guarda os PNGs das molduras)
-- Políticas dos buckets:
-- =============================================================
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('frames', 'frames', true) on conflict (id) do nothing;

create policy "photos bucket: public read" on storage.objects
  for select using (bucket_id = 'photos');
create policy "photos bucket: public insert" on storage.objects
  for insert with check (bucket_id = 'photos');
create policy "photos bucket: authed delete" on storage.objects
  for delete using (bucket_id = 'photos' and auth.uid() is not null);

create policy "frames bucket: public read" on storage.objects
  for select using (bucket_id = 'frames');
create policy "frames bucket: authed write" on storage.objects
  for insert with check (bucket_id = 'frames' and auth.uid() is not null);
create policy "frames bucket: authed delete" on storage.objects
  for delete using (bucket_id = 'frames' and auth.uid() is not null);

-- =============================================================
-- Trigger: criar evento automaticamente para o primeiro admin?
-- Não. O admin cria eventos pelo painel.
-- =============================================================
