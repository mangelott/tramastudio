import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { Cabecalho, Campo, Erro, Seletor, Vazio, euro, num } from '../../ui/ui'

type Valor = string | number | boolean | null
type Registo = Record<string, Valor> & { id?: string }

export interface CampoDef {
  chave: string
  rotulo: string
  tipo: 'texto' | 'numero' | 'opcao' | 'bool' | 'fornecedor'
  /** 'custo' = guardado na tabela de custos (só gestor). */
  origem?: 'base' | 'custo'
  opcoes?: [string, string][]
  obrigatorio?: boolean
  naLista?: boolean
  formato?: 'euro' | 'decimal'
  ajuda?: string
}

export interface ConfigCatalogo {
  titulo: string
  sobrancelha: string
  tabela: string
  ordem: string
  tabelaCustos?: string
  fkCustos?: string
  campos: CampoDef[]
  novo: Registo
  /** [campo de venda, campo de custo] para mostrar a margem. */
  margem?: [string, string]
}

function normalizarCustos(r: Record<string, unknown>, tabela?: string): Registo {
  if (!tabela) return r as Registo
  const emb = r[tabela]
  const custos = (Array.isArray(emb) ? emb[0] : emb) as Registo | undefined
  const { [tabela]: _ignorar, ...base } = r
  void _ignorar
  return { ...(base as Registo), ...(custos ?? {}) }
}

function mostrar(v: Valor, c: CampoDef) {
  if (v === null || v === undefined || v === '') return '—'
  if (c.tipo === 'bool') return v ? 'Sim' : 'Não'
  if (c.formato === 'euro') return euro.format(Number(v))
  if (c.formato === 'decimal') return num(Number(v), 1)
  if (c.tipo === 'opcao') return c.opcoes?.find(([k]) => k === v)?.[1] ?? String(v)
  return String(v)
}

export function EditorCatalogo({ config }: { config: ConfigCatalogo }) {
  const { tabela, tabelaCustos, fkCustos, campos } = config
  const [linhas, setLinhas] = useState<Registo[]>([])
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([])
  const [aEditar, setAEditar] = useState<Registo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mostrarInativos, setMostrarInativos] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const sel = tabelaCustos ? `*, ${tabelaCustos}(*)` : '*'
    const [r, f] = await Promise.all([
      supabase.from(tabela).select(sel).order(config.ordem),
      campos.some((c) => c.tipo === 'fornecedor')
        ? supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome')
        : Promise.resolve({ data: [], error: null }),
    ])
    if (r.error) setErro(r.error.message)
    else setLinhas((r.data as unknown as Record<string, unknown>[]).map((x) => normalizarCustos(x, tabelaCustos)))
    setFornecedores((f.data as { id: string; nome: string }[]) ?? [])
    setCarregando(false)
  }, [tabela, tabelaCustos, config.ordem, campos])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!aEditar) return
    setErro('')
    for (const c of campos) {
      if (c.obrigatorio && (aEditar[c.chave] === '' || aEditar[c.chave] == null)) {
        return setErro(`Preencha «${c.rotulo}».`)
      }
    }
    const base: Registo = {}
    const custo: Registo = {}
    for (const c of campos) {
      let v = aEditar[c.chave] ?? null
      if (c.tipo === 'numero') v = v === '' || v === null ? null : Number(String(v).replace(',', '.'))
      if (c.tipo === 'fornecedor' && v === '') v = null
      if (c.tipo === 'texto' && typeof v === 'string') v = v.trim() || null
      ;(c.origem === 'custo' ? custo : base)[c.chave] = v
    }
    if (aEditar.id) base.id = aEditar.id

    const r = await supabase.from(tabela).upsert(base as Record<string, unknown>).select('id').single<{ id: string }>()
    if (r.error) return setErro(r.error.message)
    if (tabelaCustos && fkCustos) {
      const rc = await supabase.from(tabelaCustos).upsert({ ...custo, [fkCustos]: r.data.id } as Record<string, unknown>)
      if (rc.error) return setErro(rc.error.message)
    }
    setAEditar(null)
    await carregar()
  }

  const visiveis = linhas.filter((l) => mostrarInativos || l.ativo !== false)
  const colunas = campos.filter((c) => c.naLista)

  return (
    <>
      <Cabecalho
        sobrancelha={config.sobrancelha}
        titulo={config.titulo}
        acoes={<button className="btn" onClick={() => { setErro(''); setAEditar({ ...config.novo }) }}>Adicionar</button>}
      />
      {!aEditar && <Erro>{erro}</Erro>}

      {aEditar && (
        <form onSubmit={guardar} className="cartao mb-8 border-areia">
          <div className="sobrancelha mb-4">{aEditar.id ? 'Editar' : 'Novo registo'}</div>
          <div className="grid gap-5 md:grid-cols-3">
            {campos.map((c) => {
              const v = aEditar[c.chave]
              const set = (nv: Valor) => setAEditar({ ...aEditar, [c.chave]: nv })
              const custoTag = c.origem === 'custo' ? ' · interno' : ''
              if (c.tipo === 'bool') {
                return (
                  <label key={c.chave} className="flex min-h-12 items-center gap-3 self-end">
                    <input type="checkbox" className="size-5 accent-bronze" checked={Boolean(v)} onChange={(e) => set(e.target.checked)} />
                    <span className="text-[15px]">{c.rotulo}</span>
                  </label>
                )
              }
              if (c.tipo === 'opcao' || c.tipo === 'fornecedor') {
                const opcoes = c.tipo === 'fornecedor' ? fornecedores.map((f) => [f.id, f.nome] as [string, string]) : c.opcoes ?? []
                return (
                  <Seletor key={c.chave} rotulo={c.rotulo + custoTag} value={String(v ?? '')} onChange={(e) => set(e.target.value)}>
                    {c.tipo === 'fornecedor' && <option value="">—</option>}
                    {opcoes.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
                  </Seletor>
                )
              }
              return (
                <Campo
                  key={c.chave}
                  rotulo={c.rotulo + custoTag}
                  inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
                  value={v === null || v === undefined ? '' : String(v)}
                  onChange={(e) => set(e.target.value)}
                  ajuda={c.ajuda}
                />
              )
            })}
          </div>
          <div className="mt-4"><Erro>{erro}</Erro></div>
          <div className="mt-5 flex gap-3">
            <button className="btn">Guardar</button>
            <button type="button" className="btn-sec" onClick={() => setAEditar(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <label className="mb-3 flex items-center gap-2 text-[13px] text-cinza">
        <input type="checkbox" className="accent-bronze" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
        Mostrar inativos
      </label>

      {carregando ? (
        <Vazio>A carregar…</Vazio>
      ) : visiveis.length === 0 ? (
        <Vazio>Ainda não há registos.</Vazio>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-linho bg-white">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-linho text-[11px] uppercase tracking-[.1em] text-cinza">
              <tr>
                {colunas.map((c) => <th key={c.chave} className="px-4 py-3 font-bold">{c.rotulo}</th>)}
                {config.margem && <th className="px-4 py-3 text-right font-bold">Margem</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-linho">
              {visiveis.map((l) => {
                let margem: number | null = null
                if (config.margem) {
                  const venda = Number(l[config.margem[0]] ?? 0)
                  const custo = Number(l[config.margem[1]] ?? 0)
                  margem = venda > 0 && custo > 0 ? ((venda - custo) / venda) * 100 : null
                }
                return (
                  <tr key={String(l.id)} className={`cursor-pointer hover:bg-algodao ${l.ativo === false ? 'opacity-50' : ''}`} onClick={() => { setErro(''); setAEditar({ ...l }) }}>
                    {colunas.map((c) => (
                      <td key={c.chave} className="px-4 py-3">{mostrar(l[c.chave] as Valor, c)}</td>
                    ))}
                    {config.margem && (
                      <td className="px-4 py-3 text-right font-semibold">{margem === null ? '—' : `${num(margem, 0)} %`}</td>
                    )}
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
