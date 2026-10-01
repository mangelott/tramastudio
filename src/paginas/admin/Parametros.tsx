import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { REGRAS_PADRAO, type RegrasCalculo } from '../../lib/calculo/cortinado'
import { Cabecalho, Campo, Erro, Vazio } from '../../ui/ui'

interface Valores {
  calculo: RegrasCalculo
  iva_pct: number
  validade_orcamento_dias: number
  rgpd_assinatura_obrigatoria: boolean
  margem_minima_pct: number
}

const ROTULOS_CALCULO: [keyof RegrasCalculo, string, string][] = [
  ['sobreposicao_lateral_cm', 'Sobreposição lateral (cm)', 'Quanto a calha passa a janela de cada lado.'],
  ['bainha_lateral_cm', 'Bainha lateral (cm)', 'Por cada lado de cada folha.'],
  ['bainha_inferior_cm', 'Bainha inferior (cm)', ''],
  ['cabecal_cm', 'Cabeçal (cm)', 'Remate superior da confeção.'],
  ['arredondamento_m', 'Arredondar metros a (m)', 'Ex.: 0,1 arredonda 4,41 m para 4,5 m.'],
]

export function Parametros() {
  const [v, setV] = useState<Valores | null>(null)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    supabase.from('parametros').select('chave, valor').then(({ data, error }) => {
      if (error) return setErro(error.message)
      const m = Object.fromEntries((data ?? []).map((p) => [p.chave, p.valor]))
      setV({
        calculo: { ...REGRAS_PADRAO, ...(m.calculo ?? {}) },
        iva_pct: Number(m.iva_pct ?? 23),
        validade_orcamento_dias: Number(m.validade_orcamento_dias ?? 30),
        rgpd_assinatura_obrigatoria: Boolean(m.rgpd_assinatura_obrigatoria ?? false),
        margem_minima_pct: Number(m.margem_minima_pct ?? 35),
      })
    })
  }, [])

  if (!v) return erro ? <Erro>{erro}</Erro> : <Vazio>A carregar…</Vazio>

  const n = (s: string) => Number(s.replace(',', '.'))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setOk(false)
    if (Object.values(v!.calculo).some((x) => !Number.isFinite(x) || x < 0)) return setErro('Valores de cálculo inválidos.')
    const linhas = [
      { chave: 'calculo', valor: v!.calculo, publico: true },
      { chave: 'iva_pct', valor: v!.iva_pct, publico: true },
      { chave: 'validade_orcamento_dias', valor: v!.validade_orcamento_dias, publico: true },
      { chave: 'rgpd_assinatura_obrigatoria', valor: v!.rgpd_assinatura_obrigatoria, publico: true },
      { chave: 'margem_minima_pct', valor: v!.margem_minima_pct, publico: false },
    ]
    const { error } = await supabase.from('parametros').upsert(linhas)
    if (error) setErro(error.message)
    else setOk(true)
  }

  return (
    <form onSubmit={guardar}>
      <Cabecalho sobrancelha="Gestão" titulo="Parâmetros" acoes={<button className="btn">Guardar</button>} />
      <p className="mb-6 max-w-2xl text-[14px] text-cinza">
        As alterações chegam aos iPads na sincronização seguinte. Os orçamentos já emitidos não mudam.
      </p>

      <div className="cartao mb-6">
        <div className="sobrancelha mb-4">Cálculo de tecido</div>
        <div className="grid gap-5 md:grid-cols-3">
          {ROTULOS_CALCULO.map(([k, r, a]) => (
            <Campo key={k} rotulo={r} ajuda={a || undefined} inputMode="decimal" defaultValue={String(v.calculo[k])}
              onChange={(e) => setV({ ...v, calculo: { ...v.calculo, [k]: n(e.target.value) } })} />
          ))}
        </div>
      </div>

      <div className="cartao mb-6 grid gap-5 md:grid-cols-3">
        <div className="sobrancelha md:col-span-3">Orçamentos</div>
        <Campo rotulo="IVA (%)" inputMode="decimal" defaultValue={String(v.iva_pct)} onChange={(e) => setV({ ...v, iva_pct: n(e.target.value) })} />
        <Campo rotulo="Validade (dias)" inputMode="numeric" defaultValue={String(v.validade_orcamento_dias)} onChange={(e) => setV({ ...v, validade_orcamento_dias: n(e.target.value) })} />
        <Campo rotulo="Margem mínima (%) · interno" inputMode="decimal" ajuda="O painel assinala orçamentos abaixo deste valor." defaultValue={String(v.margem_minima_pct)} onChange={(e) => setV({ ...v, margem_minima_pct: n(e.target.value) })} />
      </div>

      <div className="cartao">
        <div className="sobrancelha mb-3">Proteção de dados</div>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 accent-bronze" checked={v.rgpd_assinatura_obrigatoria}
            onChange={(e) => setV({ ...v, rgpd_assinatura_obrigatoria: e.target.checked })} />
          <span className="text-[15px]">
            Exigir a assinatura da informação sobre tratamento de dados.
            <span className="block text-[13px] text-cinza">
              Desligado: a informação é sempre mostrada ao cliente e fica registada como prestada, sem assinatura.
              Os consentimentos de imagem e de marketing são sempre opcionais.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4 space-y-2">
        <Erro>{erro}</Erro>
        {ok && <p className="text-[14px] text-ok">Parâmetros guardados.</p>}
      </div>
    </form>
  )
}
