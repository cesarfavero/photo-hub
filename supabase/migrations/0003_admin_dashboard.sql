-- 0003: controle de clientes (ativo/bloqueado) + configurações do site

-- clientes podem ser ativados/bloqueados pelo admin
alter table public.profiles
  add column if not exists active boolean not null default true;

-- configurações do site (uma linha só, id = 1)
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'Photo Hub',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, site_name)
values (1, 'Photo Hub')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

create policy "site_settings_read" on public.site_settings
  for select using (true);

-- admin pode atualizar as configurações
create policy "site_settings_admin_update" on public.site_settings
  for update to authenticated
  using (public.is_admin());
