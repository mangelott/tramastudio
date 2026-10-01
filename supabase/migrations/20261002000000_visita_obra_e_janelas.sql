-- =====================================================================
-- Fase 2 · Visita
-- Dados da obra na visita e escolhas de confeção, tecido, forro e calha
-- em cada janela. O orçamento (fase 3) é gerado a partir destas escolhas.
-- =====================================================================

create type public.tipo_imovel as enum ('apartamento', 'moradia', 'escritorio', 'outro');

alter table public.visitas
  add column tipo_imovel     public.tipo_imovel,
  add column piso            text,
  add column elevador        boolean,
  add column estacionamento  text,
  add column iniciada_em     timestamptz;

alter table public.janelas
  add column confecao_id     uuid references public.confecoes (id),
  add column tecido_id       uuid references public.tecidos (id),
  add column forro_id        uuid references public.tecidos (id),
  add column calha_id        uuid references public.artigos (id),
  add column com_instalacao  boolean not null default true,
  add column quantidade      int not null default 1 check (quantidade >= 1);

-- Uma janela pode ser registada antes de medida (ex.: divisão acabada de criar).
-- As medidas, quando existem, continuam a ter de ser maiores que zero.
alter table public.janelas
  alter column largura_cm drop not null,
  alter column altura_cm  drop not null;

alter table public.clientes
  add column origem          text;   -- «Como nos conheceu»

create index on public.janelas (updated_at);
create index on public.fotos (updated_at);
