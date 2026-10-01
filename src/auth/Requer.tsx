import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useSessao } from './Sessao'
import type { Papel } from '../lib/tipos'
import { Ecra } from '../ui/ui'

/** Exige sessão iniciada, perfil ativo e, opcionalmente, um papel. */
export function Requer({ papel, children }: { papel?: Papel; children: ReactNode }) {
  const { carregando, sessao, perfil, sair } = useSessao()
  const local = useLocation()

  if (carregando) return <Ecra>A carregar…</Ecra>
  if (!sessao) return <Navigate to="/login" replace state={{ de: local.pathname }} />
  if (!perfil || !perfil.ativo) {
    return (
      <Ecra>
        <p className="mb-4">A sua conta não está ativa. Fale com o gestor.</p>
        <button className="btn-sec" onClick={sair}>Sair</button>
      </Ecra>
    )
  }
  if (papel && perfil.papel !== papel) return <Navigate to="/app" replace />
  return <>{children}</>
}
