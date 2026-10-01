/**
 * Motor de cálculo de cortinados.
 * Funções puras, sem rede nem base de dados: correm no iPad, offline.
 * As regras estão documentadas em docs/ESPECIFICACAO.md (secção 7).
 */

export type Abertura = 'central' | 'lateral_esq' | 'lateral_dir'
export type Orientacao = 'ao_alto' | 'de_altura'
export type Unidade = 'm' | 'un' | 'm2' | 'h'

export interface RegrasCalculo {
  sobreposicao_lateral_cm: number
  bainha_lateral_cm: number
  bainha_inferior_cm: number
  cabecal_cm: number
  arredondamento_m: number
}

export const REGRAS_PADRAO: RegrasCalculo = {
  sobreposicao_lateral_cm: 15,
  bainha_lateral_cm: 5,
  bainha_inferior_cm: 10,
  cabecal_cm: 5,
  arredondamento_m: 0.1,
}

export interface Janela {
  largura_cm: number
  altura_cm: number
  abertura: Abertura
  /** Janelas iguais (ex.: 3 janelas idênticas no quarto). */
  quantidade?: number
}

export interface ConfecaoCalc {
  nome?: string
  fator_franzido: number
  /** Preço de venda por metro de calha. */
  preco_venda_m: number
}

export interface TecidoCalc {
  nome?: string
  largura_cm: number
  orientacao: Orientacao
  raccord_cm: number
  preco_venda_m: number
}

export interface ArtigoCalc {
  nome?: string
  unidade: Unidade
  preco_venda: number
}

export interface ResultadoTecido {
  largura_calha_cm: number
  folhas: number
  largura_necessaria_cm: number
  altura_corte_cm: number
  orientacao_usada: Orientacao
  /** Número de larguras de rolo (só ao alto). */
  larguras: number
  metros: number
  avisos: string[]
}

export interface LinhaPreco {
  rotulo: string
  quantidade: number
  unidade: Unidade
  preco_unitario: number
  total: number
}

export interface ResultadoJanela {
  tecido: ResultadoTecido
  forro?: ResultadoTecido
  linhas: LinhaPreco[]
  /** Total para uma janela. */
  total_unitario: number
  quantidade: number
  /** total_unitario × quantidade. */
  total: number
}

export interface Totais {
  subtotal: number
  desconto_valor: number
  base: number
  iva_valor: number
  total: number
}

const EPS = 1e-9

/** Arredonda a cêntimos (meio para cima). */
export function cent(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

/** Arredonda para cima ao passo indicado (ex.: 0,1 m). */
export function arredondarParaCima(v: number, passo: number): number {
  if (passo <= 0) return cent(v)
  return cent(Math.ceil(v / passo - EPS) * passo)
}

export function folhasDaAbertura(abertura: Abertura): number {
  return abertura === 'central' ? 2 : 1
}

function validarJanela(j: Janela) {
  if (!(j.largura_cm > 0) || !(j.altura_cm > 0)) {
    throw new Error('A largura e a altura da janela têm de ser maiores que zero.')
  }
}

/** Metros de tecido (ou forro) para uma janela. */
export function calcularTecido(
  janela: Janela,
  confecao: Pick<ConfecaoCalc, 'fator_franzido'>,
  tecido: Pick<TecidoCalc, 'largura_cm' | 'orientacao' | 'raccord_cm'>,
  regras: RegrasCalculo = REGRAS_PADRAO,
): ResultadoTecido {
  validarJanela(janela)
  const avisos: string[] = []
  const folhas = folhasDaAbertura(janela.abertura)
  const largura_calha_cm = janela.largura_cm + 2 * regras.sobreposicao_lateral_cm
  const largura_necessaria_cm =
    largura_calha_cm * confecao.fator_franzido + folhas * 2 * regras.bainha_lateral_cm
  const altura_corte_cm = janela.altura_cm + regras.bainha_inferior_cm + regras.cabecal_cm

  let orientacao_usada: Orientacao = tecido.orientacao
  if (orientacao_usada === 'de_altura' && altura_corte_cm > tecido.largura_cm + EPS) {
    avisos.push(
      `A altura de corte (${altura_corte_cm} cm) excede a largura do rolo (${tecido.largura_cm} cm). ` +
        'Calculado ao alto, com costuras.',
    )
    orientacao_usada = 'ao_alto'
  }

  let larguras = 0
  let metrosBrutos: number
  if (orientacao_usada === 'de_altura') {
    metrosBrutos = largura_necessaria_cm / 100
  } else {
    larguras = Math.ceil(largura_necessaria_cm / tecido.largura_cm - EPS)
    const corte =
      tecido.raccord_cm > 0
        ? Math.ceil(altura_corte_cm / tecido.raccord_cm - EPS) * tecido.raccord_cm
        : altura_corte_cm
    metrosBrutos = (larguras * corte) / 100
  }

  return {
    largura_calha_cm,
    folhas,
    largura_necessaria_cm,
    altura_corte_cm,
    orientacao_usada,
    larguras,
    metros: arredondarParaCima(metrosBrutos, regras.arredondamento_m),
    avisos,
  }
}

function linha(rotulo: string, quantidade: number, unidade: Unidade, preco: number): LinhaPreco {
  return { rotulo, quantidade, unidade, preco_unitario: preco, total: cent(quantidade * preco) }
}

/** Preço de venda de uma janela, componente a componente. */
export function calcularJanela(params: {
  janela: Janela
  confecao: ConfecaoCalc
  tecido: TecidoCalc
  forro?: TecidoCalc | null
  calha?: ArtigoCalc | null
  instalacao?: ArtigoCalc | null
  regras?: RegrasCalculo
}): ResultadoJanela {
  const { janela, confecao, tecido, forro, calha, instalacao } = params
  const regras = params.regras ?? REGRAS_PADRAO
  const quantidade = Math.max(1, Math.floor(janela.quantidade ?? 1))

  const rTecido = calcularTecido(janela, confecao, tecido, regras)
  const rForro = forro ? calcularTecido(janela, confecao, forro, regras) : undefined
  const calha_m = cent(rTecido.largura_calha_cm / 100)

  const linhas: LinhaPreco[] = [
    linha(`Tecido${tecido.nome ? ` · ${tecido.nome}` : ''}`, rTecido.metros, 'm', tecido.preco_venda_m),
  ]
  if (forro && rForro) {
    linhas.push(linha(`Forro${forro.nome ? ` · ${forro.nome}` : ''}`, rForro.metros, 'm', forro.preco_venda_m))
  }
  linhas.push(linha(`Confeção${confecao.nome ? ` · ${confecao.nome}` : ''}`, calha_m, 'm', confecao.preco_venda_m))
  if (calha) {
    const q = calha.unidade === 'm' ? calha_m : 1
    linhas.push(linha(`Calha${calha.nome ? ` · ${calha.nome}` : ''}`, q, calha.unidade, calha.preco_venda))
  }
  if (instalacao) {
    linhas.push(linha(instalacao.nome ?? 'Instalação', 1, instalacao.unidade, instalacao.preco_venda))
  }

  const total_unitario = cent(linhas.reduce((s, l) => s + l.total, 0))
  return {
    tecido: rTecido,
    forro: rForro,
    linhas,
    total_unitario,
    quantidade,
    total: cent(total_unitario * quantidade),
  }
}

/** Totais do orçamento: desconto sobre o subtotal, IVA sobre a base. */
export function calcularTotais(valores: number[], desconto_pct = 0, iva_pct = 23): Totais {
  const subtotal = cent(valores.reduce((s, v) => s + v, 0))
  const desconto_valor = cent((subtotal * Math.min(Math.max(desconto_pct, 0), 100)) / 100)
  const base = cent(subtotal - desconto_valor)
  const iva_valor = cent((base * iva_pct) / 100)
  return { subtotal, desconto_valor, base, iva_valor, total: cent(base + iva_valor) }
}
