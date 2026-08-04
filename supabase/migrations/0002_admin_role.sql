-- 0002: papel de admin (dono da plataforma) + visão geral de clientes

-- perfis: um por usuário, com flag de admin
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- backfill: perfil para todos os usuários existentes
insert into public.profiles (id, email, is_admin, created_at)
select u.id, u.email, false, u.created_at
from auth.users u
on conflict (id) do nothing;

-- marca o dono da plataforma como admin
update public.profiles
set is_admin = true
where email = 'cesar.favsouza@gmail.com';

-- perfil automático para novos cadastros
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- helper: o usuário atual é admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin
  );
$$;

-- RLS em profiles: cada usuário vê o próprio; admin vê todos
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.is_admin());

-- admin pode LER todos os eventos (visão geral), mas não editar
drop policy if exists "events_own_select" on events;
create policy "events_own_select" on events
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
