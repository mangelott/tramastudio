import type { Abertura, Orientacao, Unidade } from './calculo/cortinado'

export type Papel = 'gestor' | 'tecnico'

export interface Perfil {
  id: string
  nome: string
  email: string | null
  papel: Papel
  ativo: boolean
}

export interface Cliente {
  id: string
  nome: string
  nif: string | null
  telefone: string | null
  email: string | null
  morada: string | null
  codigo_postal: string | null
  localidade: string | null
  notas: string | null
  origem?: string | null
  criado_por: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Tecido {
  id: string
  referencia: string
  nome: string
  colecao: string | null
  tipo: 'tecido' | 'forro' | 'blackout'
  composicao: string | null
  opacidade: string | null
  largura_cm: number
  orientacao: Orientacao
  raccord_cm: number
  preco_venda_m: number
  ativo: boolean
}

export interface Confecao {
  id: string
  codigo: string
  nome: string
  fator_franzido: number
  preco_venda_m: number
  ordem: number
  ativo: boolean
}

export interface Artigo {
  id: string
  codigo: string
  nome: string
  tipo: 'calha' | 'varao' | 'acessorio' | 'servico'
  unidade: Unidade
  preco_venda: number
  ativo: boolean
}

export interface Parametro {
  chave: string
  valor: unknown
  descricao: string | null
  publico: boolean
}

export type EstadoVisita = 'agendada' | 'em_curso' | 'concluida' | 'cancelada'
export type TipoImovel = 'apartamento' | 'moradia' | 'escritorio' | 'outro'
export type Fixacao = 'teto' | 'parede'

export interface Visita {
  id: string
  cliente_id: string
  tecnico_id: string
  agendada_para: string | null
  estado: EstadoVisita
  morada_obra: string | null
  codigo_postal: string | null
  localidade: string | null
  observacoes: string | null
  tipo_imovel: TipoImovel | null
  piso: string | null
  elevador: boolean | null
  estacionamento: string | null
  iniciada_em: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Janela medida numa visita, com as escolhas de confeção e tecido. */
export interface JanelaVisita {
  id: string
  visita_id: string
  divisao: string
  designacao: string | null
  /** null enquanto não for medida. */
  largura_cm: number | null
  altura_cm: number | null
  fixacao: Fixacao
  abertura: Abertura
  observacoes: string | null
  ordem: number
  confecao_id: string | null
  tecido_id: string | null
  forro_id: string | null
  calha_id: string | null
  com_instalacao: boolean
  quantidade: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Foto {
  id: string
  visita_id: string
  janela_id: string | null
  /** No bucket 'fotos': visitas/{visita_id}/{id}.jpg */
  storage_path: string
  legenda: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type { Abertura }
