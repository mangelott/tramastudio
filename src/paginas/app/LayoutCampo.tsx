import { useEffect } from 'react'
import { NavLink, Outlet, Link } from 'react-router'
import { useSessao } from '../../auth/Sessao'
import { db, pedirArmazenamentoPersistente } from '../../lib/db'
import { iniciarSincronizacaoAutomatica } from '../../lib/sync'
import { useEstadoSync } from '../../ui/ui'
import { Icone, type NomeIcone } from '../../ui/icones'

const separadores: { para: string; rotulo: string; icone: NomeIcone; fim?: boolean }[] = [
  { para: '/app', rotulo: 'Hoje', icone: 'hoje', fim: true },
  { para: '/app/clientes', rotulo: 'Clientes', icone: 'clientes' },
  { para: '/app/visitas', rotulo: 'Visitas', icone: 'visitas' },
  { para: '/app/calculadora', rotulo: 'Calcular', icone: 'calculadora' },
]

export async function sairComConfirmacao(sair: () => Promise<void>) {
  const n = await db.pendentes.count()
  if (n && !confirm(`Há ${n} alteração(ões) por enviar. Se sair agora, perdem-se. Sair mesmo assim?`)) return
  await sair()
}

/** Símbolo provisório; substituir pelo símbolo compacto do pacote de marca (04_Simbolo_Compacto). */
function Simbolo() {
  return <img src="/favicon.svg" alt="Trama Studio" className="size-12 rounded-xl" />
}

function EstadoSyncBarra() {
  const { cor, texto, aSincronizar, sincronizarAgora } = useEstadoSync()
  return (
    <button
      onClick={sincronizarAgora}
      title="Sincronizar agora"
      className="flex min-h-14 w-[84px] flex-col items-center justify-center gap-1.5 rounded-xl text-center text-[11px] font-semibold leading-tight text-areia"
    >
      <span className={`size-2.5 rounded-full ${cor} ${aSincronizar ? 'animate-pulse' : ''}`} />
      {aSincronizar ? 'A sincronizar…' : texto}
    </button>
  )
}

export function LayoutCampo() {
  const { perfil, sair } = useSessao()

  useEffect(() => {
    void pedirArmazenamentoPersistente()
    return iniciarSincronizacaoAutomatica()
  }, [])

  return (
    <div className="flex min-h-dvh">
      <nav
        aria-label="Navegação principal"
        className="sticky top-0 flex h-dvh w-24 shrink-0 flex-col items-center gap-2 bg-tinta pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]"
      >
        <Simbolo />
        <div className="h-5" />
        {separadores.map((s) => (
          <NavLink
            key={s.para}
            to={s.para}
            end={s.fim}
            className={({ isActive }) =>
              `flex h-[68px] w-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl text-[12px] font-semibold transition ${
                isActive ? 'bg-bronze/15 text-algodao [&>svg]:text-bronze' : 'text-[#b9ae9f]'
              }`
            }
          >
            <Icone nome={s.icone} />
            {s.rotulo}
          </NavLink>
        ))}
        <div className="flex-1" />
        <EstadoSyncBarra />
        {perfil?.papel === 'gestor' && (
          <Link to="/admin" className="flex min-h-14 w-[76px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-[#b9ae9f]">
            <Icone nome="backoffice" tamanho={20} />
            Backoffice
          </Link>
        )}
        <button
          className="flex min-h-14 w-[76px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-[#b9ae9f]"
          onClick={() => sairComConfirmacao(sair)}
          title={`${perfil?.nome ?? ''} · Sair`}
        >
          <Icone nome="sair" tamanho={20} />
          Sair
        </button>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}

/** Conteúdo normal de uma página da app de campo (sem a barra da visita). */
export function Pagina({ children, larga = false }: { children: React.ReactNode; larga?: boolean }) {
  return <main className={`mx-auto w-full flex-1 px-6 py-8 lg:px-12 lg:py-10 ${larga ? 'max-w-7xl' : 'max-w-6xl'}`}>{children}</main>
}
