-- ============================================================
-- BI Pneus FEMSA — Schema Supabase
-- Rodar no SQL Editor do projeto
-- ============================================================

-- Estado atual (substituído a cada carga do loader)
create table if not exists snapshot (
  endpoint   text primary key,          -- 'vehicles' | 'tires' | 'inspections'
  branch_id  bigint not null default 2707,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Histórico mensal por pneu (acumula 1 foto por pneu por mês)
create table if not exists historico_mensal (
  id          bigint generated always as identity primary key,
  competencia date not null,            -- primeiro dia do mês
  branch_id   bigint not null default 2707,
  tire_id     bigint not null,
  serial      text,
  placa       text,
  menor_mm    numeric,
  amplitude   numeric,
  ciclo_vida  int,
  dot         text,
  pressao_atual numeric,
  pressao_ideal numeric,
  pressao_nok boolean,
  status_mm   text,
  criado_em   timestamptz not null default now(),
  unique (competencia, tire_id)
);

-- RLS: leitura pública (anon), escrita só service_role
alter table snapshot enable row level security;
alter table historico_mensal enable row level security;

create policy "leitura publica snapshot"
  on snapshot for select using (true);

create policy "leitura publica historico"
  on historico_mensal for select using (true);

-- (service_role ignora RLS, então o loader grava sem policy extra)

-- ============================================================
-- CPK no histórico mensal (rodar uma vez no SQL Editor)
-- ============================================================
alter table historico_mensal add column if not exists cpk numeric;
alter table historico_mensal add column if not exists km_rodados numeric;
alter table historico_mensal add column if not exists custo numeric;
