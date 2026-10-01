import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import { SessaoProvider } from './auth/Sessao'
import { Requer } from './auth/Requer'
import { Login, DefinirPalavraPasse } from './paginas/Login'
import { LayoutCampo, Pagina } from './paginas/app/LayoutCampo'
import { Hoje } from './paginas/app/Hoje'
import { Clientes, FichaCliente } from './paginas/app/Clientes'
import { Calculadora } from './paginas/app/Calculadora'
import { NovaVisita, Visitas } from './paginas/app/visita/Visitas'
import { LayoutVisita } from './paginas/app/visita/LayoutVisita'
import { Obra } from './paginas/app/visita/Obra'
import { Janelas } from './paginas/app/visita/Janelas'
import { Confecao } from './paginas/app/visita/Confecao'
import './index.css'

// O backoffice só é usado pelo gestor: carrega em separado da app de campo.
const admin = <K extends string>(carregar: () => Promise<Record<K, () => ReactNode>>, nome: K) =>
  () => carregar().then((m) => ({ Component: m[nome] }))

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/definir-palavra-passe', element: <DefinirPalavraPasse /> },
  {
    path: '/app',
    element: <Requer><LayoutCampo /></Requer>,
    children: [
      { index: true, element: <Hoje /> },
      { path: 'clientes', element: <Pagina><Clientes /></Pagina> },
      { path: 'clientes/novo', element: <Pagina><FichaCliente key="novo" /></Pagina> },
      { path: 'clientes/:id', element: <Pagina><FichaCliente /></Pagina> },
      { path: 'calculadora', element: <Pagina larga><Calculadora /></Pagina> },
      { path: 'visitas', element: <Visitas /> },
      { path: 'visitas/nova', element: <NovaVisita /> },
      {
        path: 'visitas/:id',
        element: <LayoutVisita />,
        children: [
          { index: true, element: <Navigate to="obra" replace /> },
          { path: 'obra', element: <Obra /> },
          { path: 'janelas', element: <Janelas /> },
          { path: 'janelas/:janelaId', element: <Janelas /> },
          { path: 'janelas/:janelaId/confecao', element: <Confecao /> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <Requer papel="gestor"><Outlet /></Requer>,
    children: [
      {
        lazy: admin(() => import('./paginas/admin/LayoutAdmin'), 'LayoutAdmin'),
        children: [
          { index: true, lazy: admin(() => import('./paginas/admin/Painel'), 'Painel') },
          { path: 'tecidos', lazy: admin(() => import('./paginas/admin/Catalogo'), 'Tecidos') },
          { path: 'confecoes', lazy: admin(() => import('./paginas/admin/Catalogo'), 'Confecoes') },
          { path: 'artigos', lazy: admin(() => import('./paginas/admin/Catalogo'), 'Artigos') },
          { path: 'fornecedores', lazy: admin(() => import('./paginas/admin/Catalogo'), 'Fornecedores') },
          { path: 'parametros', lazy: admin(() => import('./paginas/admin/Parametros'), 'Parametros') },
          { path: 'utilizadores', lazy: admin(() => import('./paginas/admin/Utilizadores'), 'Utilizadores') },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/app" replace /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessaoProvider>
      <RouterProvider router={router} />
    </SessaoProvider>
  </StrictMode>,
)
