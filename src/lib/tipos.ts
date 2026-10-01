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

export type { Abertura }
