import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import { SessaoProvider } from './auth/Sessao'
import { Requer } from './auth/Requer'
import { Login, DefinirPalavraPasse } from './paginas/Login'
import { LayoutCampo } from './paginas/app/LayoutCampo'
import { Hoje } from './paginas/app/Hoje'
import { Clientes, FichaCliente } from './paginas/app/Clientes'
import { Calculadora } from './paginas/app/Calculadora'
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
      { path: 'clientes', element: <Clientes /> },
      { path: 'clientes/novo', element: <FichaCliente key="novo" /> },
      { path: 'clientes/:id', element: <FichaCliente /> },
      { path: 'calculadora', element: <Calculadora /> },
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
