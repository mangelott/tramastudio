/**
 * Teclado numérico das medidas (cm).
 * Função pura: recebe o texto atual e a tecla, devolve o novo texto.
 * Aceita uma vírgula decimal (uma casa) e no máximo 4 algarismos inteiros (até 9999 cm).
 */
export type Tecla = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'apagar'

export function aplicarTecla(atual: string, tecla: Tecla): string {
  if (tecla === 'apagar') return atual.slice(0, -1)
  const [inteira, decimal] = atual.split(',')
  if (tecla === ',') {
    if (atual.includes(',')) return atual
    return (atual || '0') + ','
  }
  if (decimal !== undefined) {
    return decimal.length >= 1 ? atual : atual + tecla
  }
  if (inteira === '0') return tecla // sem zeros à esquerda
  if (inteira.length >= 4) return atual
  return atual + tecla
}

/** Converte o texto do teclado em centímetros (null se vazio ou zero). */
export function textoParaCm(texto: string): number | null {
  const v = Number(texto.replace(',', '.'))
  return Number.isFinite(v) && v > 0 ? v : null
}

/** Centímetros para o texto do teclado (ex.: 240,5). */
export function cmParaTexto(cm: number | null | undefined): string {
  if (cm == null) return ''
  return String(cm).replace('.', ',')
}
