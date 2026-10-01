import { useEffect } from 'react'
import { Outlet, useLocation, useOutletContext, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../lib/db'
import { hora, iniciarVisita, moradaCompleta } from '../../../lib/visitas'
import type { Cliente, Visita } from '../../../lib/tipos'
import { Icone } from '../../../ui/icones'
import { Passos, type PassoVisita } from '../../../ui/visita'
import { Vazio } from '../../../ui/ui'
import { Pagina } from '../LayoutCampo'

export interface ContextoVisita {
  visita: Visita
  cliente: Cliente | undefined
}

export const useVisita = () => useOutletContext<ContextoVisita>()

export function LayoutVisita() {
  const { id } = useParams()
  const { pathname } = useLocation()
  const visita = useLiveQuery(() => (id ? db.visitas.get(id) : undefined), [id], null)
  const cliente = useLiveQuery(() => (visita ? db.clientes.get(visita.cliente_id) : undefined), [visita?.cliente_id])

  // Abrir a visita marca-a como em curso.
  useEffect(() => {
    if (visita?.estado === 'agendada') void iniciarVisita(visita)
  }, [visita])

  if (visita === null) return <Pagina><Vazio>A carregar…</Vazio></Pagina>
  if (!visita || visita.deleted_at) return <Pagina><Vazio>Esta visita não está neste iPad.</Vazio></Pagina>

  const passo: PassoVisita = pathname.includes('/janelas') ? 'janelas' : 'obra'

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex min-h-24 flex-wrap items-center justify-between gap-4 border-b border-areia px-6 py-4 lg:px-10">
        <div className="min-w-0">
          <div className="sobrancelha mb-1">
            {visita.estado === 'concluida' ? 'Visita concluída' : 'Visita em curso'} · {hora(visita.agendada_para)}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
            <span className="titulo-serif text-[28px]">{cliente?.nome ?? 'Cliente'}</span>
            <span className="flex items-center gap-1.5 text-[14px] text-cinza">
              <Icone nome="local" tamanho={16} />
              {moradaCompleta(visita) || 'Morada por indicar'}
            </span>
          </div>
        </div>
        <Passos atual={passo} visitaId={visita.id} />
      </header>
      <Outlet context={{ visita, cliente } satisfies ContextoVisita} />
    </div>
  )
}
