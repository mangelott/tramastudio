import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSessao } from '../../../auth/Sessao'
import { db } from '../../../lib/db'
import { dataCurta, gravarVisita, hora, moradaCompleta, novaVisita, useVisitas } from '../../../lib/visitas'
import type { Cliente, EstadoVisita } from '../../../lib/tipos'
import { Erro, Vazio } from '../../../ui/ui'
import { Icone } from '../../../ui/icones'
import { Pagina } from '../LayoutCampo'

const ESTADOS: Record<EstadoVisita, string> = {
  agendada: 'Marcada',
  em_curso: 'Em curso',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export function Visitas() {
  const { perfil } = useSessao()
  const visitas = useVisitas(perfil?.id)
  const clientes = useLiveQuery(async () => new Map((await db.clientes.toArray()).map((c) => [c.id, c])), [], new Map<string, Cliente>())
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const proximas = visitas.filter((v) => v.estado === 'em_curso' || (v.estado === 'agendada' && (!v.agendada_para || new Date(v.agendada_para) >= hoje)))
  const anteriores = visitas.filter((v) => !proximas.includes(v)).reverse()

  const Lista = ({ titulo, itens }: { titulo: string; itens: typeof visitas }) =>
    itens.length ? (
      <section className="mb-8">
        <h2 className="sobrancelha mb-3">{titulo}</h2>
        <ul className="divide-y divide-linho overflow-hidden rounded-2xl border border-areia bg-white">
          {itens.map((v) => (
            <li key={v.id}>
              <Link to={`/app/visitas/${v.id}/obra`} className="flex min-h-[72px] items-center gap-6 px-6 py-3 active:bg-linho/50">
                <div className="w-28 shrink-0">
                  <div className="text-[15px] font-bold">{dataCurta(v.agendada_para)}</div>
                  <div className="text-[13px] text-cinza">{hora(v.agendada_para)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-bold">{clientes.get(v.cliente_id)?.nome ?? 'Cliente'}</div>
                  <div className="truncate text-[13px] text-cinza">{moradaCompleta(v) || '—'}</div>
                </div>
                <span className="rounded-full bg-linho px-3 py-1 text-[12px] font-bold">{ESTADOS[v.estado]}</span>
                <Icone nome="direita" tamanho={20} className="text-cinza" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null

  return (
    <Pagina>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="sobrancelha mb-2">As suas visitas</div>
          <h1 className="titulo-serif text-[44px] leading-tight">Visitas</h1>
        </div>
        <Link to="/app/visitas/nova" className="btn-grande">
          <Icone nome="mais" tamanho={20} />
          Nova visita
        </Link>
      </div>
      {visitas.length === 0 ? (
        <Vazio>Ainda não há visitas neste iPad.</Vazio>
      ) : (
        <>
          <Lista titulo="Próximas e em curso" itens={proximas} />
          <Lista titulo="Anteriores" itens={anteriores} />
        </>
      )}
    </Pagina>
  )
}

const semAcentos = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Valor para <input type="datetime-local">, na hora local. */
function paraInputLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function NovaVisita() {
  const nav = useNavigate()
  const { perfil } = useSessao()
  const [params] = useSearchParams()
  const clientes = useLiveQuery(() => db.clientes.orderBy('nome').filter((c) => !c.deleted_at).toArray(), [], [])
  const [clienteId, setClienteId] = useState(params.get('cliente') ?? '')
  const [pesquisa, setPesquisa] = useState('')
  const proximaHora = new Date()
  proximaHora.setMinutes(0, 0, 0)
  proximaHora.setHours(proximaHora.getHours() + 1)
  const [quando, setQuando] = useState(paraInputLocal(proximaHora))
  const [erro, setErro] = useState('')

  const filtrados = useMemo(() => {
    const q = semAcentos(pesquisa.trim())
    return q ? clientes.filter((c) => [c.nome, c.telefone, c.localidade].some((v) => v && semAcentos(v).includes(q))) : clientes
  }, [clientes, pesquisa])
  const cliente = clientes.find((c) => c.id === clienteId)

  async function criar(e: FormEvent, comecarJa: boolean) {
    e.preventDefault()
    if (!cliente) return setErro('Escolha o cliente.')
    const data = comecarJa ? new Date() : new Date(quando)
    if (Number.isNaN(data.getTime())) return setErro('Indique a data e a hora.')
    const v = await gravarVisita(novaVisita(cliente, perfil!.id, data.toISOString()))
    nav(comecarJa ? `/app/visitas/${v.id}/obra` : '/app/visitas')
  }

  return (
    <Pagina>
      <form onSubmit={(e) => criar(e, false)}>
        <div className="mb-8">
          <div className="sobrancelha mb-2">Visitas</div>
          <h1 className="titulo-serif text-[44px] leading-tight">Nova visita</h1>
        </div>
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="cartao">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="titulo-serif text-[26px]">Cliente</h2>
              <Link to="/app/clientes/novo" className="text-[14px] font-semibold text-bronze-esc">+ Novo cliente</Link>
            </div>
            <label className="mb-3 flex min-h-[52px] items-center gap-2.5 rounded-xl border-[1.5px] border-areia px-4">
              <Icone nome="pesquisa" tamanho={20} className="text-cinza" />
              <span className="sr-only">Pesquisar cliente</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
                placeholder="Nome, telefone ou localidade"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
              />
            </label>
            <ul role="radiogroup" aria-label="Cliente" className="max-h-[360px] divide-y divide-linho overflow-y-auto">
              {filtrados.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={c.id === clienteId}
                    onClick={() => setClienteId(c.id)}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-lg px-3 text-left ${c.id === clienteId ? 'bg-linho' : ''}`}
                  >
                    <span>
                      <span className="block text-[16px] font-semibold">{c.nome}</span>
                      <span className="block text-[13px] text-cinza">{[c.telefone, c.localidade].filter(Boolean).join(' · ') || '—'}</span>
                    </span>
                    {c.id === clienteId && <Icone nome="certo" tamanho={20} traco={2.4} className="text-bronze" />}
                  </button>
                </li>
              ))}
              {filtrados.length === 0 && <li className="p-4 text-[14px] text-cinza">Nenhum cliente encontrado.</li>}
            </ul>
          </section>

          <section className="flex flex-col gap-5">
            <div className="cartao flex flex-col gap-5">
              <label className="block">
                <span className="rotulo">Data e hora</span>
                <input type="datetime-local" className="campo" value={quando} onChange={(e) => setQuando(e.target.value)} />
              </label>
              {cliente && (
                <p className="text-[14px] leading-relaxed text-cinza">
                  A morada da obra começa igual à do cliente: {moradaCompleta({ morada_obra: cliente.morada, localidade: cliente.localidade }) || 'sem morada'}. Pode alterá-la na visita.
                </p>
              )}
              <Erro>{erro}</Erro>
              <button className="btn-grande">Marcar visita</button>
              <button type="button" className="btn-grande-sec" onClick={(e) => criar(e, true)}>
                Começar já
                <Icone nome="direita" tamanho={20} />
              </button>
            </div>
          </section>
        </div>
      </form>
    </Pagina>
  )
}
