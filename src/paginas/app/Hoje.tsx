import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSessao } from '../../auth/Sessao'
import { db } from '../../lib/db'
import { Cabecalho } from '../../ui/ui'

export function Hoje() {
  const { perfil } = useSessao()
  const nClientes = useLiveQuery(() => db.clientes.filter((c) => !c.deleted_at).count(), [], 0)
  const ultima = useLiveQuery(() => db.meta.get('ultima_sync'), [])
  const erroSync = useLiveQuery(() => db.meta.get('erro_sync'), [])
  const comErro = useLiveQuery(() => db.pendentes.filter((p) => Boolean(p.erro)).toArray(), [], [])

  const data = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <>
      <Cabecalho sobrancelha={data} titulo={`Olá, ${perfil?.nome ?? ''}`} />

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/app/clientes/novo" className="cartao block transition hover:border-areia">
          <div className="sobrancelha mb-2">Novo</div>
          <div className="font-serif text-[24px]">Cliente</div>
          <p className="mt-1 text-[14px] text-cinza">Registar dados de contacto e morada.</p>
        </Link>
        <Link to="/app/calculadora" className="cartao block transition hover:border-areia">
          <div className="sobrancelha mb-2">Calcular</div>
          <div className="font-serif text-[24px]">Tecido e preço</div>
          <p className="mt-1 text-[14px] text-cinza">Metros e valor para uma janela.</p>
        </Link>
        <Link to="/app/clientes" className="cartao block transition hover:border-areia">
          <div className="sobrancelha mb-2">Clientes</div>
          <div className="font-serif text-[24px]">{nClientes}</div>
          <p className="mt-1 text-[14px] text-cinza">disponíveis neste iPad.</p>
        </Link>
      </div>

      <div className="cartao mt-6">
        <div className="sobrancelha mb-2">Visitas</div>
        <p className="text-[15px] text-cinza">
          A agenda de visitas, as medições por janela e os orçamentos chegam na próxima fase.
        </p>
      </div>

      {comErro.length > 0 && (
        <div className="cartao mt-6 border-erro/30">
          <div className="sobrancelha mb-2 text-erro">Alterações recusadas pelo servidor</div>
          <ul className="space-y-1 text-[14px]">
            {comErro.map((p) => (
              <li key={p.seq}>
                {p.tabela} · {String(p.registo.nome ?? p.registo.id)} — {p.erro}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-[12px] text-cinza-claro">
        {ultima?.valor
          ? `Última sincronização: ${new Date(ultima.valor as string).toLocaleString('pt-PT')}`
          : 'Ainda não sincronizado.'}
        {erroSync?.valor ? ` · Erro: ${String(erroSync.valor)}` : ''}
      </p>
    </>
  )
}
