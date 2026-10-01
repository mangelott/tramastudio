import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Cabecalho, Erro, Vazio, euro, num } from '../../ui/ui'

interface LinhaMargem {
  id: string
  numero: string
  estado: string
  created_at: string
  tecnico_id: string
  total: number
  subtotal: number
  desconto_valor: number
  custo_total: number
  margem_valor: number
  margem_pct: number | null
}

export function Painel() {
  const [dados, setDados] = useState<LinhaMargem[] | null>(null)
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [margemMin, setMargemMin] = useState(35)
  const [erro, setErro] = useState('')

  useEffect(() => {
    void (async () => {
      const [o, p, m] = await Promise.all([
        supabase.from('v_orcamentos_margem').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('perfis').select('id, nome'),
        supabase.from('parametros').select('valor').eq('chave', 'margem_minima_pct').maybeSingle(),
      ])
      if (o.error) return setErro(o.error.message)
      setDados(o.data as LinhaMargem[])
      setNomes(Object.fromEntries((p.data ?? []).map((x) => [x.id, x.nome])))
      if (m.data) setMargemMin(Number(m.data.valor))
    })()
  }, [])

  if (erro) return <Erro>{erro}</Erro>
  if (!dados) return <Vazio>A carregar…</Vazio>

  const aceites = dados.filter((d) => d.estado === 'aceite')
  const decididos = dados.filter((d) => d.estado === 'aceite' || d.estado === 'recusado')
  const soma = (l: LinhaMargem[], k: keyof LinhaMargem) => l.reduce((s, d) => s + Number(d[k] ?? 0), 0)
  const baseAceites = soma(aceites, 'subtotal') - soma(aceites, 'desconto_valor')
  const margemMedia = baseAceites > 0 ? (soma(aceites, 'margem_valor') / baseAceites) * 100 : null
  const abertos = dados.filter((d) => d.estado === 'rascunho' || d.estado === 'enviado')

  const kpis = [
    { rotulo: 'Orçamentos', valor: String(dados.length), nota: `${abertos.length} em aberto` },
    { rotulo: 'Taxa de aceitação', valor: decididos.length ? `${num((aceites.length / decididos.length) * 100, 0)} %` : '—', nota: `${aceites.length} aceites` },
    { rotulo: 'Vendido (c/ IVA)', valor: euro.format(soma(aceites, 'total')), nota: 'orçamentos aceites' },
    { rotulo: 'Margem média', valor: margemMedia === null ? '—' : `${num(margemMedia, 1)} %`, nota: `mínimo ${margemMin} %` },
  ]

  return (
    <>
      <Cabecalho sobrancelha="Backoffice" titulo="Painel" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.rotulo} className="cartao">
            <div className="sobrancelha">{k.rotulo}</div>
            <div className="mt-2 font-serif text-[32px] leading-none">{k.valor}</div>
            <div className="mt-2 text-[13px] text-cinza">{k.nota}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-[24px]">Últimos orçamentos</h2>
      {dados.length === 0 ? (
        <Vazio>Ainda não há orçamentos. Aparecem aqui quando os técnicos os criarem nas visitas.</Vazio>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-linho bg-white">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-linho text-[11px] uppercase tracking-[.1em] text-cinza">
              <tr>
                <th className="px-4 py-3">Número</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Custo</th><th className="px-4 py-3 text-right">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linho">
              {dados.slice(0, 50).map((d) => {
                const baixa = d.margem_pct !== null && d.margem_pct < margemMin
                return (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-semibold">{d.numero}</td>
                    <td className="px-4 py-3">{new Date(d.created_at).toLocaleDateString('pt-PT')}</td>
                    <td className="px-4 py-3">{nomes[d.tecnico_id] ?? '—'}</td>
                    <td className="px-4 py-3 capitalize">{d.estado}</td>
                    <td className="px-4 py-3 text-right">{euro.format(d.total)}</td>
                    <td className="px-4 py-3 text-right">{euro.format(d.custo_total)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${baixa ? 'text-erro' : ''}`}>
                      {d.margem_pct === null ? '—' : `${num(d.margem_pct, 1)} %`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
