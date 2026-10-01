import { useEffect } from 'react'
import { NavLink, Outlet, Link } from 'react-router'
import { useSessao } from '../../auth/Sessao'
import { db, pedirArmazenamentoPersistente } from '../../lib/db'
import { iniciarSincronizacaoAutomatica } from '../../lib/sync'
import { EstadoSync, Logotipo } from '../../ui/ui'

const separadores = [
  { para: '/app', rotulo: 'Hoje', fim: true },
  { para: '/app/clientes', rotulo: 'Clientes' },
  { para: '/app/calculadora', rotulo: 'Calculadora' },
]

export async function sairComConfirmacao(sair: () => Promise<void>) {
  const n = await db.pendentes.count()
  if (n && !confirm(`Há ${n} alteração(ões) por enviar. Se sair agora, perdem-se. Sair mesmo assim?`)) return
  await sair()
}

export function LayoutCampo() {
  const { perfil, sair } = useSessao()

  useEffect(() => {
    void pedirArmazenamentoPersistente()
    return iniciarSincronizacaoAutomatica()
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-linho bg-algodao/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <Logotipo />
        <div className="flex items-center gap-2">
          <EstadoSync />
          {perfil?.papel === 'gestor' && (
            <Link to="/admin" className="btn-sec min-h-10 px-4 text-[13px]">Backoffice</Link>
          )}
          <button className="min-h-10 px-3 text-[13px] font-semibold text-cinza" onClick={() => sairComConfirmacao(sair)}>
            {perfil?.nome} · Sair
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-center gap-2 border-t border-linho bg-white/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        {separadores.map((s) => (
          <NavLink
            key={s.para}
            to={s.para}
            end={s.fim}
            className={({ isActive }) =>
              `min-h-12 min-w-32 rounded-lg px-5 text-center text-[15px] font-semibold leading-[48px] ${
                isActive ? 'bg-tinta text-algodao' : 'text-cinza'
              }`
            }
          >
            {s.rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
