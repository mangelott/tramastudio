import { NavLink, Outlet, Link } from 'react-router'
import { useSessao } from '../../auth/Sessao'
import { Logotipo } from '../../ui/ui'
import { sairComConfirmacao } from '../app/LayoutCampo'

const menu = [
  { para: '/admin', rotulo: 'Painel', fim: true },
  { grupo: 'Catálogo' },
  { para: '/admin/tecidos', rotulo: 'Tecidos e forros' },
  { para: '/admin/confecoes', rotulo: 'Confeções' },
  { para: '/admin/artigos', rotulo: 'Calhas e serviços' },
  { para: '/admin/fornecedores', rotulo: 'Fornecedores' },
  { grupo: 'Gestão' },
  { para: '/admin/parametros', rotulo: 'Parâmetros' },
  { para: '/admin/utilizadores', rotulo: 'Utilizadores' },
] as const

export function LayoutAdmin() {
  const { perfil, sair } = useSessao()
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-linho bg-white p-5 md:flex">
        <Logotipo />
        <div className="sobrancelha mt-1">Backoffice</div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {menu.map((m) =>
            'grupo' in m ? (
              <div key={m.grupo} className="mt-5 mb-1 px-3 text-[11px] font-bold uppercase tracking-[.14em] text-cinza-claro">{m.grupo}</div>
            ) : (
              <NavLink
                key={m.para}
                to={m.para}
                end={'fim' in m}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-[14px] font-semibold ${isActive ? 'bg-linho text-tinta' : 'text-cinza hover:bg-algodao'}`
                }
              >
                {m.rotulo}
              </NavLink>
            ),
          )}
        </nav>
        <Link to="/app" className="btn-sec mb-2">App de campo</Link>
        <button className="text-[13px] font-semibold text-cinza" onClick={() => sairComConfirmacao(sair)}>
          {perfil?.nome} · Sair
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Navegação compacta para ecrãs estreitos */}
        <nav className="flex gap-1 overflow-x-auto border-b border-linho bg-white px-3 py-2 md:hidden">
          {menu.filter((m) => !('grupo' in m)).map((m) =>
            'para' in m ? (
              <NavLink key={m.para} to={m.para} end={'fim' in m} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold ${isActive ? 'bg-linho' : 'text-cinza'}`}>
                {m.rotulo}
              </NavLink>
            ) : null,
          )}
          <NavLink to="/app" className="whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-bronze-esc">App</NavLink>
        </nav>
        <main className="mx-auto max-w-6xl p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
