import { describe, expect, it } from 'vitest'
import { aplicarTecla, cmParaTexto, textoParaCm, type Tecla } from './teclado'

const escrever = (teclas: Tecla[], inicio = '') => teclas.reduce(aplicarTecla, inicio)

describe('teclado numérico', () => {
  it('escreve números inteiros', () => {
    expect(escrever(['2', '4', '0'])).toBe('240')
  })
  it('não aceita zeros à esquerda', () => {
    expect(escrever(['0', '0', '7'])).toBe('7')
  })
  it('aceita uma só vírgula e uma casa decimal', () => {
    expect(escrever(['2', '4', '0', ',', '5', '7', ','])).toBe('240,5')
  })
  it('vírgula no início fica 0,', () => {
    expect(escrever([','])).toBe('0,')
  })
  it('limita a 4 algarismos inteiros', () => {
    expect(escrever(['1', '2', '3', '4', '5'])).toBe('1234')
  })
  it('apaga o último carácter', () => {
    expect(escrever(['apagar'], '240,5')).toBe('240,')
    expect(escrever(['apagar'], '')).toBe('')
  })
  it('converte para centímetros e de volta', () => {
    expect(textoParaCm('240,5')).toBe(240.5)
    expect(textoParaCm('0')).toBeNull()
    expect(textoParaCm('')).toBeNull()
    expect(cmParaTexto(240.5)).toBe('240,5')
    expect(cmParaTexto(null)).toBe('')
  })
})
