import { describe, expect, it } from 'vitest'
import { codigoPostalValido, formatarCodigoPostal, nifValido } from './validacao'

describe('nifValido', () => {
  it('aceita NIF com dígito de controlo correto', () => {
    expect(nifValido('123456789')).toBe(true)
    expect(nifValido('501964843')).toBe(true)
  })
  it('rejeita dígito de controlo errado ou formato inválido', () => {
    expect(nifValido('123456780')).toBe(false)
    expect(nifValido('12345678')).toBe(false)
    expect(nifValido('323456789')).toBe(false)
  })
})

describe('código postal', () => {
  it('valida e formata', () => {
    expect(codigoPostalValido('2800-123')).toBe(true)
    expect(codigoPostalValido('2800123')).toBe(false)
    expect(formatarCodigoPostal('2800123')).toBe('2800-123')
  })
})
