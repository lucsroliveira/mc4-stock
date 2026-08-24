-- Execute este script no SQL Editor do Supabase para habilitar o
-- gerenciamento de Categorias e Clientes pela área de Administração.

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table public.categorias enable row level security;
alter table public.clientes enable row level security;

drop policy if exists "categorias_select_authenticated" on public.categorias;
create policy "categorias_select_authenticated" on public.categorias
  for select using (auth.role() = 'authenticated');

drop policy if exists "categorias_admin_manage" on public.categorias;
create policy "categorias_admin_manage" on public.categorias
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "clientes_select_authenticated" on public.clientes;
create policy "clientes_select_authenticated" on public.clientes
  for select using (auth.role() = 'authenticated');

drop policy if exists "clientes_admin_manage" on public.clientes;
create policy "clientes_admin_manage" on public.clientes
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Popula com os valores que já estavam fixos no código, para não perder nada.
insert into public.categorias (nome) values
  ('Cenografia'), ('Vestuario'), ('Brindes'), ('OOH'), ('Ativação'), ('Outros')
on conflict (nome) do nothing;

insert into public.clientes (nome) values
  ('Interno / MC4'), ('Esportes da Sorte'), ('Boticário'), ('MOOD'), ('Cenoura e Bronze')
on conflict (nome) do nothing;
