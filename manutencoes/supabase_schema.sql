-- ============================================================
-- Custos Frota FEMSA — Manutenção (Realizado) + Orçamento
-- Rodar no SQL Editor do projeto Supabase (mesmo do BI de Pneus)
-- ============================================================

-- Realizado: uma linha por OS (do relatório RelGeralOsCadastradas)
create table if not exists manutencao_os (
  os               bigint primary key,        -- nº da OS (chave; reimportar = upsert)
  vigencia         date not null,             -- 1º dia do mês (derivado da data de entrada)
  tipo             text,                       -- Tipo de Manutenção (Corretiva/Preventiva)
  codigo           text,                       -- Código de Manutenção (origem do custo)
  placa            text,                       -- Veículo
  status           text,
  aprovador        text,
  fornecedor       text,                       -- Estabelecimento
  cidade           text,
  entrada          timestamptz,
  retirada         timestamptz,
  horas_imob       numeric,
  valor_orcado_os  numeric,                    -- Valor Total Orçado da própria OS
  valor_pecas      numeric,
  valor_mao_obra   numeric,
  valor_aprovado   numeric,                    -- Valor Total Aprovado = REALIZADO
  importado_em     timestamptz not null default now()
);
create index if not exists idx_manut_vigencia on manutencao_os (vigencia);

-- Orçamento de frota: um valor por mês
create table if not exists orcamento_frota (
  vigencia      date primary key,             -- 1º dia do mês
  valor         numeric not null,
  atualizado_em timestamptz not null default now()
);

-- RLS: leitura pública (anon) · escrita só service_role (Edge Function)
alter table manutencao_os   enable row level security;
alter table orcamento_frota enable row level security;

create policy "leitura publica manutencao" on manutencao_os   for select using (true);
create policy "leitura publica orcamento"  on orcamento_frota for select using (true);
-- (service_role ignora RLS; o Edge Function de importação grava com ela)
