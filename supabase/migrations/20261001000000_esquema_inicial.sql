-- =====================================================================
-- Trama Studio · esquema inicial
-- Perfis (gestor / tecnico), clientes, visitas, janelas, catálogo,
-- custos (só gestor), orçamentos, documentos, assinaturas, consentimentos.
-- As permissões são aplicadas por Row Level Security.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel as enum ('gestor', 'tecnico');
create type public.estado_visita as enum ('agendada', 'em_curso', 'concluida', 'cancelada');
create type public.estado_orcamento as enum ('rascunho', 'enviado', 'aceite', 'recusado', 'expirado', 'anulado');
create type public.tipo_tecido as enum ('tecido', 'forro', 'blackout');
create type public.orientacao_tecido as enum ('ao_alto', 'de_altura');
create type public.tipo_artigo as enum ('calha', 'varao', 'acessorio', 'servico');
create type public.unidade as enum ('m', 'un', 'm2', 'h');
create type public.fixacao as enum ('teto', 'parede');
create type public.abertura as enum ('central', 'lateral_esq', 'lateral_dir');
create type public.tipo_linha as enum ('janela', 'artigo');
create type public.tipo_documento as enum ('orcamento', 'termos', 'rgpd', 'consentimentos');
create type public.estado_documento as enum ('gerado', 'assinado', 'enviado', 'anulado');
create type public.tipo_consentimento as enum ('rgpd_informacao', 'imagem', 'marketing');

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------
create table public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null default '',
  email       text,
  papel       public.papel not null default 'tecnico',
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger perfis_updated before update on public.perfis
  for each row execute function public.tocar_updated_at();

-- Funções de permissão. SECURITY DEFINER para não entrarem em recursão
-- com as políticas RLS das próprias tabelas.
create or replace function public.papel_atual()
returns public.papel language sql stable security definer set search_path = '' as $$
  select p.papel from public.perfis p where p.id = auth.uid() and p.ativo
$$;

create or replace function public.eh_ativo()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfis p where p.id = auth.uid() and p.ativo)
$$;

create or replace function public.eh_gestor()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.papel_atual() = 'gestor', false)
$$;

-- Cria o perfil quando o utilizador é convidado/registado.
-- O primeiro utilizador da instalação fica gestor; os seguintes, técnicos.
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.perfis) then 'tecnico'::public.papel
         else 'gestor'::public.papel end
  );
  return new;
end $$;

create trigger ao_criar_utilizador after insert on auth.users
  for each row execute function public.criar_perfil();

-- ---------------------------------------------------------------------
-- Parâmetros (cálculo, IVA, validade…). publico = visível para técnicos.
-- ---------------------------------------------------------------------
create table public.parametros (
  chave       text primary key,
  valor       jsonb not null,
  descricao   text,
  publico     boolean not null default true,
  updated_at  timestamptz not null default now()
);
create trigger parametros_updated before update on public.parametros
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------
-- Fornecedores (só gestor)
-- ---------------------------------------------------------------------
create table public.fornecedores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  nif         text,
  contacto    text,
  telefone    text,
  email       text,
  notas       text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger fornecedores_updated before update on public.fornecedores
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------
-- Catálogo: preço de venda visível a todos; custo em tabela à parte.
-- ---------------------------------------------------------------------
create table public.tecidos (
  id              uuid primary key default gen_random_uuid(),
  referencia      text not null,
  nome            text not null,
  colecao         text,
  tipo            public.tipo_tecido not null default 'tecido',
  composicao      text,
  opacidade       text,
  largura_cm      numeric(6,1) not null check (largura_cm > 0),
  orientacao      public.orientacao_tecido not null default 'ao_alto',
  raccord_cm      numeric(6,1) not null default 0 check (raccord_cm >= 0),
  preco_venda_m   numeric(10,2) not null default 0 check (preco_venda_m >= 0),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (referencia)
);
create trigger tecidos_updated before update on public.tecidos
  for each row execute function public.tocar_updated_at();

create table public.tecidos_custos (
  tecido_id       uuid primary key references public.tecidos (id) on delete cascade,
  fornecedor_id   uuid references public.fornecedores (id),
  ref_fornecedor  text,
  preco_custo_m   numeric(10,2) not null default 0 check (preco_custo_m >= 0),
  updated_at      timestamptz not null default now()
);
create trigger tecidos_custos_updated before update on public.tecidos_custos
  for each row execute function public.tocar_updated_at();

create table public.confecoes (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique,
  nome              text not null,
  fator_franzido    numeric(4,2) not null check (fator_franzido >= 1),
  preco_venda_m     numeric(10,2) not null default 0 check (preco_venda_m >= 0), -- por metro de calha
  ordem             int not null default 0,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger confecoes_updated before update on public.confecoes
  for each row execute function public.tocar_updated_at();

create table public.confecoes_custos (
  confecao_id     uuid primary key references public.confecoes (id) on delete cascade,
  fornecedor_id   uuid references public.fornecedores (id),
  preco_custo_m   numeric(10,2) not null default 0 check (preco_custo_m >= 0),
  updated_at      timestamptz not null default now()
);
create trigger confecoes_custos_updated before update on public.confecoes_custos
  for each row execute function public.tocar_updated_at();

create table public.artigos (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  nome            text not null,
  tipo            public.tipo_artigo not null,
  unidade         public.unidade not null default 'un',
  preco_venda     numeric(10,2) not null default 0 check (preco_venda >= 0),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger artigos_updated before update on public.artigos
  for each row execute function public.tocar_updated_at();

create table public.artigos_custos (
  artigo_id       uuid primary key references public.artigos (id) on delete cascade,
  fornecedor_id   uuid references public.fornecedores (id),
  preco_custo     numeric(10,2) not null default 0 check (preco_custo >= 0),
  updated_at      timestamptz not null default now()
);
create trigger artigos_custos_updated before update on public.artigos_custos
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------
-- Clientes, visitas, janelas, fotografias
-- Os ids podem ser gerados no iPad (offline). deleted_at = apagado lógico.
-- ---------------------------------------------------------------------
create table public.clientes (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  nif             text,
  telefone        text,
  email           text,
  morada          text,
  codigo_postal   text,
  localidade      text,
  notas           text,
  criado_por      uuid not null default auth.uid() references public.perfis (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on public.clientes (updated_at);
create index on public.clientes (criado_por);
create trigger clientes_updated before update on public.clientes
  for each row execute function public.tocar_updated_at();

create table public.visitas (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes (id),
  tecnico_id      uuid not null default auth.uid() references public.perfis (id),
  agendada_para   timestamptz,
  estado          public.estado_visita not null default 'agendada',
  morada_obra     text,
  codigo_postal   text,
  localidade      text,
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on public.visitas (tecnico_id);
create index on public.visitas (cliente_id);
create index on public.visitas (updated_at);
create trigger visitas_updated before update on public.visitas
  for each row execute function public.tocar_updated_at();

create table public.janelas (
  id              uuid primary key default gen_random_uuid(),
  visita_id       uuid not null references public.visitas (id) on delete cascade,
  divisao         text not null,
  designacao      text,
  largura_cm      numeric(7,1) not null check (largura_cm > 0),
  altura_cm       numeric(7,1) not null check (altura_cm > 0),
  fixacao         public.fixacao not null default 'teto',
  abertura        public.abertura not null default 'central',
  observacoes     text,
  ordem           int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on public.janelas (visita_id);
create trigger janelas_updated before update on public.janelas
  for each row execute function public.tocar_updated_at();

create table public.fotos (
  id              uuid primary key default gen_random_uuid(),
  visita_id       uuid not null references public.visitas (id) on delete cascade,
  janela_id       uuid references public.janelas (id) on delete set null,
  storage_path    text not null,          -- bucket 'fotos': visitas/{visita_id}/{id}.jpg
  legenda         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on public.fotos (visita_id);
create trigger fotos_updated before update on public.fotos
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------
-- Orçamentos
-- ---------------------------------------------------------------------
create table public.contadores (
  serie   text primary key,
  ultimo  int not null default 0
);

create table public.orcamentos (
  id              uuid primary key default gen_random_uuid(),
  visita_id       uuid not null references public.visitas (id),
  numero          text unique,             -- atribuído pela BD: ORC 2026/0001
  estado          public.estado_orcamento not null default 'rascunho',
  valido_ate      date,
  subtotal        numeric(12,2) not null default 0,
  desconto_pct    numeric(5,2) not null default 0 check (desconto_pct between 0 and 100),
  desconto_valor  numeric(12,2) not null default 0,
  iva_pct         numeric(5,2) not null default 23,
  iva_valor       numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  condicoes       text,
  criado_por      uuid not null default auth.uid() references public.perfis (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on public.orcamentos (visita_id);
create index on public.orcamentos (updated_at);
create trigger orcamentos_updated before update on public.orcamentos
  for each row execute function public.tocar_updated_at();

create or replace function public.numerar_orcamento()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s text := 'ORC' || to_char(now(), 'YYYY');
  n int;
begin
  if new.numero is null then
    insert into public.contadores (serie, ultimo) values (s, 1)
      on conflict (serie) do update set ultimo = public.contadores.ultimo + 1
      returning ultimo into n;
    new.numero := 'ORC ' || to_char(now(), 'YYYY') || '/' || lpad(n::text, 4, '0');
  end if;
  return new;
end $$;
create trigger orcamentos_numero before insert on public.orcamentos
  for each row execute function public.numerar_orcamento();

create table public.orcamento_linhas (
  id                    uuid primary key default gen_random_uuid(),
  orcamento_id          uuid not null references public.orcamentos (id) on delete cascade,
  tipo                  public.tipo_linha not null default 'janela',
  janela_id             uuid references public.janelas (id),
  descricao             text not null,
  -- componentes (linha de janela)
  confecao_id           uuid references public.confecoes (id),
  tecido_id             uuid references public.tecidos (id),
  forro_id              uuid references public.tecidos (id),
  calha_id              uuid references public.artigos (id),
  instalacao_id         uuid references public.artigos (id),
  largura_calha_m       numeric(8,3) not null default 0,
  metros_tecido         numeric(8,2) not null default 0,
  metros_forro          numeric(8,2) not null default 0,
  -- linha de artigo avulso
  artigo_id             uuid references public.artigos (id),
  -- preços de venda no momento do orçamento
  quantidade            numeric(10,2) not null default 1,
  preco_unitario        numeric(12,2) not null default 0,
  total                 numeric(12,2) not null default 0,
  detalhe_calculo       jsonb,             -- passos do cálculo, para revisão
  ordem                 int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on public.orcamento_linhas (orcamento_id);
create trigger orcamento_linhas_updated before update on public.orcamento_linhas
  for each row execute function public.tocar_updated_at();

-- Custo de cada linha, copiado pela BD. Só o gestor lê.
create table public.orcamento_linhas_custos (
  linha_id        uuid primary key references public.orcamento_linhas (id) on delete cascade,
  orcamento_id    uuid not null references public.orcamentos (id) on delete cascade,
  custo_total     numeric(12,2) not null,
  calculado_em    timestamptz not null default now()
);
create index on public.orcamento_linhas_custos (orcamento_id);

create or replace function public.registar_custo_linha()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c numeric := 0;
begin
  if new.tipo = 'janela' then
    c := c + new.metros_tecido * coalesce((select preco_custo_m from public.tecidos_custos where tecido_id = new.tecido_id), 0);
    c := c + new.metros_forro * coalesce((select preco_custo_m from public.tecidos_custos where tecido_id = new.forro_id), 0);
    c := c + new.largura_calha_m * coalesce((select preco_custo_m from public.confecoes_custos where confecao_id = new.confecao_id), 0);
    c := c + new.largura_calha_m * coalesce((select preco_custo from public.artigos_custos where artigo_id = new.calha_id), 0);
    c := c + coalesce((select preco_custo from public.artigos_custos where artigo_id = new.instalacao_id), 0);
    c := c * new.quantidade;
  else
    c := new.quantidade * coalesce((select preco_custo from public.artigos_custos where artigo_id = new.artigo_id), 0);
  end if;

  insert into public.orcamento_linhas_custos (linha_id, orcamento_id, custo_total)
  values (new.id, new.orcamento_id, round(c, 2))
  on conflict (linha_id) do update
    set custo_total = excluded.custo_total, calculado_em = now();
  return new;
end $$;
create trigger orcamento_linhas_custo after insert or update on public.orcamento_linhas
  for each row execute function public.registar_custo_linha();

-- Um orçamento aceite (assinado) fica congelado.
create or replace function public.bloquear_orcamento_aceite()
returns trigger language plpgsql as $$
begin
  if old.estado = 'aceite' then
    raise exception 'O orçamento % já foi aceite e não pode ser alterado.', old.numero;
  end if;
  return coalesce(new, old);
end $$;
create trigger orcamentos_congelar before update or delete on public.orcamentos
  for each row execute function public.bloquear_orcamento_aceite();

create or replace function public.bloquear_linhas_aceites()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  oid uuid := coalesce(new.orcamento_id, old.orcamento_id);
begin
  if exists (select 1 from public.orcamentos o where o.id = oid and o.estado = 'aceite') then
    raise exception 'Linhas de um orçamento aceite não podem ser alteradas.';
  end if;
  return coalesce(new, old);
end $$;
create trigger orcamento_linhas_congelar before insert or update or delete on public.orcamento_linhas
  for each row execute function public.bloquear_linhas_aceites();

-- ---------------------------------------------------------------------
-- Documentos, assinaturas, consentimentos
-- ---------------------------------------------------------------------
create table public.documentos (
  id              uuid primary key default gen_random_uuid(),
  tipo            public.tipo_documento not null,
  cliente_id      uuid not null references public.clientes (id),
  visita_id       uuid references public.visitas (id),
  orcamento_id    uuid references public.orcamentos (id),
  estado          public.estado_documento not null default 'gerado',
  storage_path    text,                     -- bucket 'documentos': visitas/{visita_id}/{id}.pdf
  sha256          text,
  enviado_para    text,
  enviado_em      timestamptz,
  criado_por      uuid not null default auth.uid() references public.perfis (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on public.documentos (cliente_id);
create index on public.documentos (visita_id);
create trigger documentos_updated before update on public.documentos
  for each row execute function public.tocar_updated_at();

create table public.assinaturas (
  id                uuid primary key default gen_random_uuid(),
  documento_id      uuid not null references public.documentos (id),
  nome_signatario   text not null,
  assinado_em       timestamptz not null,
  sha256_pdf        text not null,
  imagem_path       text,                   -- bucket 'documentos'
  tecnico_id        uuid not null default auth.uid() references public.perfis (id),
  user_agent        text,
  latitude          numeric(9,6),
  longitude         numeric(9,6),
  registado_em      timestamptz not null default now()
);
create index on public.assinaturas (documento_id);

-- Registos de assinatura e de consentimento são só de acrescentar.
create or replace function public.impedir_alteracao()
returns trigger language plpgsql as $$
begin
  raise exception 'Este registo não pode ser alterado nem apagado.';
end $$;
create trigger assinaturas_imutaveis before update or delete on public.assinaturas
  for each row execute function public.impedir_alteracao();

-- O estado atual de cada consentimento é o registo mais recente desse tipo.
create table public.consentimentos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes (id),
  tipo            public.tipo_consentimento not null,
  concedido       boolean not null,
  assinado        boolean not null default false,  -- false = informação prestada, sem assinatura
  documento_id    uuid references public.documentos (id),
  registado_por   uuid not null default auth.uid() references public.perfis (id),
  registado_em    timestamptz not null default now()
);
create index on public.consentimentos (cliente_id, tipo, registado_em desc);
create trigger consentimentos_imutaveis before update or delete on public.consentimentos
  for each row execute function public.impedir_alteracao();

create view public.consentimentos_atuais with (security_invoker = true) as
  select distinct on (cliente_id, tipo) *
  from public.consentimentos
  order by cliente_id, tipo, registado_em desc;

-- ---------------------------------------------------------------------
-- Funções de acesso por registo (SECURITY DEFINER, evitam recursão RLS)
-- ---------------------------------------------------------------------
create or replace function public.pode_ver_visita(vid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_gestor()
      or exists (select 1 from public.visitas v
                 where v.id = vid and v.tecnico_id = auth.uid() and public.eh_ativo())
$$;

create or replace function public.pode_ver_cliente(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.eh_gestor()
      or (public.eh_ativo() and (
            exists (select 1 from public.clientes c where c.id = cid and c.criado_por = auth.uid())
         or exists (select 1 from public.visitas v where v.cliente_id = cid and v.tecnico_id = auth.uid())))
$$;

create or replace function public.pode_ver_orcamento(oid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orcamentos o where o.id = oid and public.pode_ver_visita(o.visita_id))
$$;

create or replace function public.pode_ver_documento(did uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.documentos d where d.id = did
                 and (public.eh_gestor()
                      or (d.visita_id is not null and public.pode_ver_visita(d.visita_id))
                      or (d.visita_id is null and public.pode_ver_cliente(d.cliente_id))))
$$;

-- Só o gestor pode apagar (mesmo logicamente, via deleted_at).
create or replace function public.apagar_so_gestor()
returns trigger language plpgsql as $$
begin
  if new.deleted_at is distinct from old.deleted_at and not public.eh_gestor() then
    raise exception 'Só o gestor pode apagar registos.';
  end if;
  return new;
end $$;
create trigger clientes_apagar before update on public.clientes
  for each row execute function public.apagar_so_gestor();
create trigger visitas_apagar before update on public.visitas
  for each row execute function public.apagar_so_gestor();
create trigger orcamentos_apagar before update on public.orcamentos
  for each row execute function public.apagar_so_gestor();
create trigger documentos_apagar before update on public.documentos
  for each row execute function public.apagar_so_gestor();

-- Um técnico não pode passar uma visita para outro técnico.
create or replace function public.reatribuir_so_gestor()
returns trigger language plpgsql as $$
begin
  if new.tecnico_id is distinct from old.tecnico_id and not public.eh_gestor() then
    raise exception 'Só o gestor pode reatribuir visitas.';
  end if;
  return new;
end $$;
create trigger visitas_reatribuir before update on public.visitas
  for each row execute function public.reatribuir_so_gestor();

-- ---------------------------------------------------------------------
-- Métricas (só gestor)
-- ---------------------------------------------------------------------
create view public.v_orcamentos_margem with (security_invoker = true) as
  select o.id, o.numero, o.estado, o.created_at, v.tecnico_id, v.cliente_id,
         o.subtotal, o.desconto_valor, o.total,
         coalesce(sum(c.custo_total), 0) as custo_total,
         (o.subtotal - o.desconto_valor) - coalesce(sum(c.custo_total), 0) as margem_valor,
         case when (o.subtotal - o.desconto_valor) > 0
              then round(((o.subtotal - o.desconto_valor) - coalesce(sum(c.custo_total), 0))
                         / (o.subtotal - o.desconto_valor) * 100, 1) end as margem_pct
  from public.orcamentos o
  join public.visitas v on v.id = o.visita_id
  left join public.orcamento_linhas_custos c on c.orcamento_id = o.id
  where o.deleted_at is null and public.eh_gestor()
  group by o.id, v.tecnico_id, v.cliente_id;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.perfis                   enable row level security;
alter table public.parametros               enable row level security;
alter table public.fornecedores             enable row level security;
alter table public.tecidos                  enable row level security;
alter table public.tecidos_custos           enable row level security;
alter table public.confecoes                enable row level security;
alter table public.confecoes_custos         enable row level security;
alter table public.artigos                  enable row level security;
alter table public.artigos_custos           enable row level security;
alter table public.clientes                 enable row level security;
alter table public.visitas                  enable row level security;
alter table public.janelas                  enable row level security;
alter table public.fotos                    enable row level security;
alter table public.contadores               enable row level security;
alter table public.orcamentos               enable row level security;
alter table public.orcamento_linhas         enable row level security;
alter table public.orcamento_linhas_custos  enable row level security;
alter table public.documentos               enable row level security;
alter table public.assinaturas              enable row level security;
alter table public.consentimentos           enable row level security;

-- Perfis: cada um vê o seu; o gestor vê e altera todos.
create policy perfis_ler on public.perfis for select to authenticated
  using (id = auth.uid() or public.eh_gestor());
create policy perfis_gerir on public.perfis for update to authenticated
  using (public.eh_gestor()) with check (public.eh_gestor());

-- Parâmetros: técnicos leem os públicos; gestor tudo.
create policy parametros_ler on public.parametros for select to authenticated
  using (public.eh_gestor() or (publico and public.eh_ativo()));
create policy parametros_gerir on public.parametros for all to authenticated
  using (public.eh_gestor()) with check (public.eh_gestor());

-- Catálogo com preço de venda: leitura para utilizadores ativos; escrita do gestor.
create policy tecidos_ler   on public.tecidos   for select to authenticated using (public.eh_ativo());
create policy tecidos_gerir on public.tecidos   for all    to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy confecoes_ler   on public.confecoes for select to authenticated using (public.eh_ativo());
create policy confecoes_gerir on public.confecoes for all    to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy artigos_ler   on public.artigos   for select to authenticated using (public.eh_ativo());
create policy artigos_gerir on public.artigos   for all    to authenticated using (public.eh_gestor()) with check (public.eh_gestor());

-- Custos e fornecedores: só gestor.
create policy fornecedores_gestor   on public.fornecedores   for all to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy tecidos_custos_gestor on public.tecidos_custos for all to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy confecoes_custos_gestor on public.confecoes_custos for all to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy artigos_custos_gestor on public.artigos_custos for all to authenticated using (public.eh_gestor()) with check (public.eh_gestor());
create policy linhas_custos_gestor  on public.orcamento_linhas_custos for select to authenticated using (public.eh_gestor());
-- contadores: sem políticas (só a função de numeração lhes acede).

-- Clientes
create policy clientes_ler on public.clientes for select to authenticated
  using (public.pode_ver_cliente(id));
create policy clientes_criar on public.clientes for insert to authenticated
  with check (public.eh_ativo() and (criado_por = auth.uid() or public.eh_gestor()));
create policy clientes_alterar on public.clientes for update to authenticated
  using (public.pode_ver_cliente(id)) with check (public.pode_ver_cliente(id) or criado_por = auth.uid());
create policy clientes_apagar on public.clientes for delete to authenticated
  using (public.eh_gestor());

-- Visitas
create policy visitas_ler on public.visitas for select to authenticated
  using (public.eh_gestor() or (tecnico_id = auth.uid() and public.eh_ativo()));
create policy visitas_criar on public.visitas for insert to authenticated
  with check (public.eh_gestor() or (tecnico_id = auth.uid() and public.pode_ver_cliente(cliente_id)));
create policy visitas_alterar on public.visitas for update to authenticated
  using (public.eh_gestor() or (tecnico_id = auth.uid() and public.eh_ativo()))
  with check (public.eh_gestor() or tecnico_id = auth.uid());
create policy visitas_apagar on public.visitas for delete to authenticated
  using (public.eh_gestor());

-- Janelas e fotografias: herdam da visita.
create policy janelas_acesso on public.janelas for all to authenticated
  using (public.pode_ver_visita(visita_id)) with check (public.pode_ver_visita(visita_id));
create policy fotos_acesso on public.fotos for all to authenticated
  using (public.pode_ver_visita(visita_id)) with check (public.pode_ver_visita(visita_id));

-- Orçamentos e linhas: herdam da visita.
create policy orcamentos_ler on public.orcamentos for select to authenticated
  using (public.pode_ver_visita(visita_id));
create policy orcamentos_criar on public.orcamentos for insert to authenticated
  with check (public.pode_ver_visita(visita_id));
create policy orcamentos_alterar on public.orcamentos for update to authenticated
  using (public.pode_ver_visita(visita_id)) with check (public.pode_ver_visita(visita_id));
create policy orcamentos_apagar on public.orcamentos for delete to authenticated
  using (public.eh_gestor());
create policy linhas_acesso on public.orcamento_linhas for all to authenticated
  using (public.pode_ver_orcamento(orcamento_id)) with check (public.pode_ver_orcamento(orcamento_id));

-- Documentos
create policy documentos_ler on public.documentos for select to authenticated
  using (public.pode_ver_documento(id));
create policy documentos_criar on public.documentos for insert to authenticated
  with check (public.eh_ativo() and public.pode_ver_cliente(cliente_id)
              and (visita_id is null or public.pode_ver_visita(visita_id)));
create policy documentos_alterar on public.documentos for update to authenticated
  using (public.pode_ver_documento(id)) with check (public.pode_ver_cliente(cliente_id));

-- Assinaturas e consentimentos: ler e acrescentar.
create policy assinaturas_ler on public.assinaturas for select to authenticated
  using (public.pode_ver_documento(documento_id));
create policy assinaturas_criar on public.assinaturas for insert to authenticated
  with check (tecnico_id = auth.uid() and public.pode_ver_documento(documento_id));
create policy consentimentos_ler on public.consentimentos for select to authenticated
  using (public.pode_ver_cliente(cliente_id));
create policy consentimentos_criar on public.consentimentos for insert to authenticated
  with check (registado_por = auth.uid() and public.pode_ver_cliente(cliente_id));

-- ---------------------------------------------------------------------
-- Dados iniciais
-- ---------------------------------------------------------------------
insert into public.parametros (chave, valor, descricao, publico) values
  ('calculo', '{
     "sobreposicao_lateral_cm": 15,
     "bainha_lateral_cm": 5,
     "bainha_inferior_cm": 10,
     "cabecal_cm": 5,
     "arredondamento_m": 0.1
   }', 'Regras de cálculo de tecido', true),
  ('iva_pct', '23', 'Taxa de IVA por omissão', true),
  ('validade_orcamento_dias', '30', 'Validade do orçamento (dias)', true),
  ('rgpd_assinatura_obrigatoria', 'false', 'Exigir assinatura da informação RGPD', true),
  ('margem_minima_pct', '35', 'Alerta no backoffice abaixo desta margem', false);

insert into public.confecoes (codigo, nome, fator_franzido, ordem) values
  ('ONDA',    'Onda (wave)',             2.0, 1),
  ('PREGA',   'Prega simples',           2.0, 2),
  ('PREGA2',  'Prega dupla / francesa',  2.5, 3),
  ('ILHOS',   'Ilhós',                   1.8, 4),
  ('FRANZ',   'Franzido com fita',       2.2, 5),
  ('PAINEL',  'Liso / painel',           1.2, 6);

insert into public.artigos (codigo, nome, tipo, unidade) values
  ('INSTALACAO', 'Instalação por janela', 'servico', 'un'),
  ('DESLOCACAO', 'Deslocação',            'servico', 'un');
