import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSessao } from '../../auth/Sessao'
import { db, gravarOffline } from '../../lib/db'
import { sincronizar } from '../../lib/sync'
import type { Cliente } from '../../lib/tipos'
import { codigoPostalValido, emailValido, formatarCodigoPostal, nifValido } from '../../lib/validacao'
import { Cabecalho, Campo, Erro, Vazio } from '../../ui/ui'

const semAcentos = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function Clientes() {
  const [pesquisa, setPesquisa] = useState('')
  const todos = useLiveQuery(() => db.clientes.orderBy('nome').filter((c) => !c.deleted_at).toArray(), [], [])
  const pendentes = useLiveQuery(
    async () => new Set((await db.pendentes.toArray()).map((p) => p.registo.id as string)),
    [],
    new Set<string>(),
  )

  const lista = useMemo(() => {
    const q = semAcentos(pesquisa.trim())
    if (!q) return todos
    return todos.filter((c) =>
      [c.nome, c.telefone, c.email, c.localidade, c.nif].some((v) => v && semAcentos(v).includes(q)),
    )
  }, [todos, pesquisa])

  return (
    <>
      <Cabecalho
        sobrancelha="Clientes"
        titulo="Os seus clientes"
        acoes={<Link to="/app/clientes/novo" className="btn">Novo cliente</Link>}
      />
      <input
        className="campo mb-5"
        type="search"
        placeholder="Pesquisar por nome, telefone, email, localidade ou NIF"
        value={pesquisa}
        onChange={(e) => setPesquisa(e.target.value)}
      />
      {lista.length === 0 ? (
        <Vazio>{pesquisa ? 'Nenhum cliente corresponde à pesquisa.' : 'Ainda não há clientes.'}</Vazio>
      ) : (
        <ul className="divide-y divide-linho overflow-hidden rounded-xl border border-linho bg-white">
          {lista.map((c) => (
            <li key={c.id}>
              <Link to={`/app/clientes/${c.id}`} className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 active:bg-linho/50">
                <div>
                  <div className="text-[16px] font-semibold">{c.nome}</div>
                  <div className="text-[13px] text-cinza">
                    {[c.telefone, c.localidade].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                {pendentes.has(c.id) && <span className="text-[12px] font-semibold text-bronze-esc">por enviar</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

type Form = Pick<Cliente, 'nome' | 'nif' | 'telefone' | 'email' | 'morada' | 'codigo_postal' | 'localidade' | 'notas'>
const vazio: Form = { nome: '', nif: '', telefone: '', email: '', morada: '', codigo_postal: '', localidade: '', notas: '' }

export function FichaCliente() {
  const { id } = useParams()
  const novo = !id
  const nav = useNavigate()
  const { perfil } = useSessao()
  const existente = useLiveQuery(() => (id ? db.clientes.get(id) : undefined), [id])
  const [form, setForm] = useState<Form | null>(novo ? vazio : null)
  const [erro, setErro] = useState('')

  // Preenche o formulário quando o cliente chega da base local.
  if (!novo && !form && existente) {
    setForm(Object.fromEntries(Object.keys(vazio).map((k) => [k, existente[k as keyof Form] ?? ''])) as Form)
  }
  if (!novo && existente === undefined && form === null) return <Vazio>A carregar…</Vazio>
  if (!form) return <Vazio>Cliente não encontrado neste iPad.</Vazio>

  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: k === 'codigo_postal' ? formatarCodigoPostal(e.target.value) : e.target.value })

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const f = Object.fromEntries(Object.entries(form!).map(([k, v]) => [k, (v ?? '').trim() || null])) as Form
    if (!f.nome) return setErro('O nome é obrigatório.')
    if (f.nif && !nifValido(f.nif)) return setErro('O NIF não é válido.')
    if (f.email && !emailValido(f.email)) return setErro('O email não é válido.')
    if (f.codigo_postal && !codigoPostalValido(f.codigo_postal)) return setErro('O código postal deve ter o formato 0000-000.')

    const agora = new Date().toISOString()
    const registo: Cliente = existente
      ? { ...existente, ...f, updated_at: agora }
      : {
          id: crypto.randomUUID(),
          ...f,
          nome: f.nome,
          criado_por: perfil!.id,
          created_at: agora,
          updated_at: agora,
          deleted_at: null,
        }
    await gravarOffline('clientes', registo)
    void sincronizar()
    nav('/app/clientes')
  }

  return (
    <form onSubmit={guardar} className="mx-auto max-w-3xl">
      <Cabecalho sobrancelha={novo ? 'Novo cliente' : 'Cliente'} titulo={novo ? 'Dados do cliente' : form.nome || 'Cliente'} />
      <div className="cartao grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Campo rotulo="Nome" required autoFocus={novo} value={form.nome ?? ''} onChange={set('nome')} />
        </div>
        <Campo rotulo="Telemóvel" type="tel" inputMode="tel" value={form.telefone ?? ''} onChange={set('telefone')} />
        <Campo rotulo="Email" type="email" inputMode="email" autoCapitalize="off" value={form.email ?? ''} onChange={set('email')} ajuda="Para onde seguem os documentos assinados." />
        <div className="md:col-span-2">
          <Campo rotulo="Morada" value={form.morada ?? ''} onChange={set('morada')} />
        </div>
        <Campo rotulo="Código postal" inputMode="numeric" placeholder="0000-000" value={form.codigo_postal ?? ''} onChange={set('codigo_postal')} />
        <Campo rotulo="Localidade" value={form.localidade ?? ''} onChange={set('localidade')} />
        <Campo rotulo="NIF" inputMode="numeric" value={form.nif ?? ''} onChange={set('nif')} ajuda="Opcional. Só necessário para faturar." />
        <label className="block md:col-span-2">
          <span className="rotulo">Notas</span>
          <textarea className="campo min-h-24 py-3" value={form.notas ?? ''} onChange={set('notas')} />
        </label>
      </div>
      <div className="mt-4"><Erro>{erro}</Erro></div>
      <div className="mt-6 flex gap-3">
        <button className="btn">Guardar</button>
        <Link to="/app/clientes" className="btn-sec">Cancelar</Link>
        {!novo && id && (
          <Link to={`/app/visitas/nova?cliente=${id}`} className="btn-sec ml-auto">Marcar visita</Link>
        )}
      </div>
    </form>
  )
}
