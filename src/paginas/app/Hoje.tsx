import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSessao } from '../../auth/Sessao'
import { db } from '../../lib/db'
import { hora, mesmoDia, moradaCompleta, useVisitas } from '../../lib/visitas'
import type { Cliente, Visita } from '../../lib/tipos'
import { Icone } from '../../ui/icones'
import { Pagina } from './LayoutCampo'

function CartaoVisita({ visita, cliente, destaque }: { visita: Visita; cliente?: Cliente; destaque: boolean }) {
  const emCurso = visita.estado === 'em_curso'
  return (
    <article
      className={`flex items-center gap-7 rounded-2xl bg-white px-6 py-5 ${
        destaque ? 'border-[1.5px] border-bronze' : 'border border-areia'
      }`}
    >
      <div className="titulo-serif w-20 shrink-0 text-[34px]">{hora(visita.agendada_para)}</div>
      <div className="min-w-0 flex-1">
        {(destaque || emCurso) && (
          <div className="sobrancelha mb-1">{emCurso ? 'Em curso' : 'A seguir'}</div>
        )}
        <div className="text-[19px] font-bold">{cliente?.nome ?? 'Cliente'}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[14px] text-cinza">
          <Icone nome="local" tamanho={16} />
          {moradaCompleta(visita) || 'Morada por indicar'}
        </div>
      </div>
      <Link to={`/app/visitas/${visita.id}/obra`} className={destaque || emCurso ? 'btn-grande' : 'btn-grande-sec'}>
        {emCurso ? 'Continuar' : destaque ? 'Iniciar visita' : 'Abrir'}
        {(destaque || emCurso) && <Icone nome="direita" tamanho={20} />}
      </Link>
    </article>
  )
}

export function Hoje() {
  const { perfil } = useSessao()
  const visitas = useVisitas(perfil?.id)
  const clientes = useLiveQuery(async () => new Map((await db.clientes.toArray()).map((c) => [c.id, c])), [], new Map())
  const ultima = useLiveQuery(() => db.meta.get('ultima_sync'), [])
  const erroSync = useLiveQuery(() => db.meta.get('erro_sync'), [])
  const comErro = useLiveQuery(() => db.pendentes.filter((p) => Boolean(p.erro)).toArray(), [], [])

  const deHoje = visitas.filter((v) => mesmoDia(v.agendada_para) && v.estado !== 'cancelada' && v.estado !== 'concluida')
  const emCurso = visitas.filter((v) => v.estado === 'em_curso' && !mesmoDia(v.agendada_para))
  const proxima = deHoje.find((v) => v.estado === 'agendada')

  const data = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const n = deHoje.length

  return (
    <Pagina larga>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="sobrancelha mb-2 first-letter:uppercase">{data}</div>
          <h1 className="titulo-serif text-[44px] leading-[1.05]">
            {n === 0 ? (
              <>Bom dia{perfil?.nome ? `, ${perfil.nome}` : ''}.</>
            ) : (
              <>
                Hoje tem <i>{n === 1 ? '1 visita' : `${n} visitas`}</i>.
              </>
            )}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link to="/app/clientes/novo" className="btn-grande-sec">
            <Icone nome="mais" tamanho={20} />
            Novo cliente
          </Link>
          <Link to="/app/visitas/nova" className="btn-grande">
            <Icone nome="mais" tamanho={20} />
            Nova visita
          </Link>
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-label="Visitas de hoje" className="flex flex-col gap-4">
          {deHoje.map((v) => (
            <CartaoVisita key={v.id} visita={v} cliente={clientes.get(v.cliente_id)} destaque={v.id === proxima?.id} />
          ))}
          {n === 0 && (
            <div className="rounded-2xl border border-dashed border-areia p-10 text-center text-[15px] text-cinza">
              Não há visitas marcadas para hoje.
              <div className="mt-4">
                <Link to="/app/visitas/nova" className="btn-grande-sec">Marcar visita</Link>
              </div>
            </div>
          )}
          {emCurso.length > 0 && (
            <>
              <h2 className="sobrancelha mt-4">Por terminar de outros dias</h2>
              {emCurso.map((v) => (
                <CartaoVisita key={v.id} visita={v} cliente={clientes.get(v.cliente_id)} destaque={false} />
              ))}
            </>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-2xl bg-linho p-6">
            <div className="flex items-center gap-2.5 text-bronze-esc">
              <Icone nome="sync" tamanho={22} />
              <h2 className="text-[16px] font-bold text-tinta">Neste iPad</h2>
            </div>
            <p className="text-[14px] leading-relaxed text-cinza">
              {ultima?.valor
                ? `Última sincronização às ${hora(ultima.valor as string)}.`
                : 'Ainda não sincronizado.'}{' '}
              Sem rede, a visita fica guardada no iPad e sincroniza quando a ligação voltar.
            </p>
            {Boolean(erroSync?.valor) && <p className="text-[13px] text-erro">Último erro: {String(erroSync!.valor)}</p>}
          </section>

          {comErro.length > 0 && (
            <section className="rounded-2xl border border-erro/30 bg-white p-6">
              <h2 className="sobrancelha mb-2 text-erro">Alterações recusadas pelo servidor</h2>
              <ul className="space-y-1 text-[14px]">
                {comErro.map((p) => (
                  <li key={p.seq}>
                    {p.tabela} · {String(p.registo.nome ?? p.registo.divisao ?? p.registo.id)} — {p.erro}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </Pagina>
  )
}
