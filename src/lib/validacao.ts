/** NIF português: 9 dígitos com dígito de controlo (módulo 11). */
export function nifValido(nif: string): boolean {
  const d = nif.replace(/\s/g, '')
  if (!/^[125689]\d{8}$|^(45|70|71|72|74|75|77|79|90|91|98|99)\d{7}$/.test(d)) return false
  const soma = [...d.slice(0, 8)].reduce((s, c, i) => s + Number(c) * (9 - i), 0)
  const resto = soma % 11
  const controlo = resto < 2 ? 0 : 11 - resto
  return controlo === Number(d[8])
}

export function codigoPostalValido(cp: string): boolean {
  return /^\d{4}-\d{3}$/.test(cp.trim())
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/** Formata 1234567 → 1234-567 enquanto se escreve. */
export function formatarCodigoPostal(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 7)
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d
}
