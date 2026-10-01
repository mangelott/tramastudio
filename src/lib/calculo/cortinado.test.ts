import { describe, expect, it } from 'vitest'
import {
  REGRAS_PADRAO,
  arredondarParaCima,
  calcularJanela,
  calcularTecido,
  calcularTotais,
  type TecidoCalc,
} from './cortinado'

const onda = { nome: 'Onda', fator_franzido: 2, preco_venda_m: 25 }
const linhoAltura: TecidoCalc = { nome: 'Linho', largura_cm: 300, orientacao: 'de_altura', raccord_cm: 0, preco_venda_m: 38 }
const tecidoAoAlto: TecidoCalc = { largura_cm: 140, orientacao: 'ao_alto', raccord_cm: 0, preco_venda_m: 30 }
const janelaSala = { largura_cm: 180, altura_cm: 250, abertura: 'central' as const }

describe('calcularTecido', () => {
  it('tecido de altura: metros = largura necessária', () => {
    const r = calcularTecido(janelaSala, onda, linhoAltura)
    expect(r.largura_calha_cm).toBe(210) // 180 + 2×15
    expect(r.folhas).toBe(2)
    expect(r.largura_necessaria_cm).toBe(440) // 210×2 + 2×2×5
    expect(r.altura_corte_cm).toBe(265) // 250 + 10 + 5
    expect(r.orientacao_usada).toBe('de_altura')
    expect(r.metros).toBe(4.4)
    expect(r.avisos).toHaveLength(0)
  })

  it('tecido ao alto: larguras de rolo × altura de corte', () => {
    const r = calcularTecido(janelaSala, onda, tecidoAoAlto)
    expect(r.larguras).toBe(4) // ceil(440 / 140)
    expect(r.metros).toBe(10.6) // 4 × 2,65
  })

  it('raccord arredonda a altura de corte ao múltiplo seguinte', () => {
    const r = calcularTecido(janelaSala, onda, { ...tecidoAoAlto, raccord_cm: 32 })
    // 265 → 288 (9 × 32); 4 × 2,88 = 11,52 → 11,6
    expect(r.metros).toBe(11.6)
  })

  it('abertura lateral usa uma só folha', () => {
    const r = calcularTecido({ ...janelaSala, abertura: 'lateral_esq' }, onda, linhoAltura)
    expect(r.folhas).toBe(1)
    expect(r.largura_necessaria_cm).toBe(430)
  })

  it('tecido de altura mais baixo que o corte passa a ao alto, com aviso', () => {
    const r = calcularTecido({ ...janelaSala, altura_cm: 300 }, onda, linhoAltura)
    expect(r.orientacao_usada).toBe('ao_alto')
    expect(r.larguras).toBe(2) // ceil(440 / 300)
    expect(r.metros).toBe(6.3) // 2 × 3,15
    expect(r.avisos[0]).toMatch(/excede a largura do rolo/)
  })

  it('divisões exatas não somam uma largura a mais', () => {
    // necessária = (100+30)×2 + 20 = 280 = 2 × 140
    const r = calcularTecido({ largura_cm: 100, altura_cm: 200, abertura: 'central' }, onda, tecidoAoAlto)
    expect(r.larguras).toBe(2)
  })

  it('rejeita medidas inválidas', () => {
    expect(() => calcularTecido({ ...janelaSala, largura_cm: 0 }, onda, linhoAltura)).toThrow()
  })

  it('respeita regras personalizadas', () => {
    const r = calcularTecido(janelaSala, onda, linhoAltura, { ...REGRAS_PADRAO, sobreposicao_lateral_cm: 0 })
    expect(r.largura_calha_cm).toBe(180)
  })
})

describe('calcularJanela', () => {
  it('soma tecido, forro, confeção, calha e instalação', () => {
    const r = calcularJanela({
      janela: janelaSala,
      confecao: onda,
      tecido: linhoAltura,
      forro: { nome: 'Forro', largura_cm: 280, orientacao: 'de_altura', raccord_cm: 0, preco_venda_m: 12 },
      calha: { nome: 'Calha onda', unidade: 'm', preco_venda: 18 },
      instalacao: { nome: 'Instalação', unidade: 'un', preco_venda: 35 },
    })
    // tecido 4,4×38=167,2 · forro 4,4×12=52,8 · confeção 2,1×25=52,5 · calha 2,1×18=37,8 · inst. 35
    expect(r.linhas.map((l) => l.total)).toEqual([167.2, 52.8, 52.5, 37.8, 35])
    expect(r.total_unitario).toBe(345.3)
    expect(r.total).toBe(345.3)
  })

  it('multiplica por janelas iguais', () => {
    const r = calcularJanela({ janela: { ...janelaSala, quantidade: 3 }, confecao: onda, tecido: linhoAltura })
    expect(r.total_unitario).toBe(cents(4.4 * 38 + 2.1 * 25))
    expect(r.total).toBe(cents(r.total_unitario * 3))
  })

  it('calha vendida à unidade conta 1', () => {
    const r = calcularJanela({
      janela: janelaSala, confecao: onda, tecido: linhoAltura,
      calha: { unidade: 'un', preco_venda: 50 },
    })
    expect(r.linhas.find((l) => l.rotulo.startsWith('Calha'))?.quantidade).toBe(1)
  })
})

describe('calcularTotais', () => {
  it('aplica desconto e IVA', () => {
    const t = calcularTotais([345.3, 154.7], 10, 23)
    expect(t).toEqual({ subtotal: 500, desconto_valor: 50, base: 450, iva_valor: 103.5, total: 553.5 })
  })
  it('limita o desconto a 0–100 %', () => {
    expect(calcularTotais([100], 150).base).toBe(0)
    expect(calcularTotais([100], -5).base).toBe(100)
  })
})

describe('arredondarParaCima', () => {
  it('não sobe valores já exatos (erro de vírgula flutuante)', () => {
    expect(arredondarParaCima(0.1 + 0.2, 0.1)).toBe(0.3)
    expect(arredondarParaCima(4.41, 0.1)).toBe(4.5)
  })
})

function cents(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100
}
