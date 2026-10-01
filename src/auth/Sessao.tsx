import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { limparDadosLocais } from '../lib/db'
import type { Perfil } from '../lib/tipos'

interface EstadoSessao {
  carregando: boolean
  sessao: Session | null
  perfil: Perfil | null
  sair: () => Promise<void>
}

const Ctx = createContext<EstadoSessao | null>(null)
const CHAVE_PERFIL = 'trama.perfil'

function perfilEmCache(id: string): Perfil | null {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE_PERFIL) ?? 'null') as Perfil | null
    return p?.id === id ? p : null
  } catch {
    return null
  }
}

async function carregarPerfil(id: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome, email, papel, ativo')
    .eq('id', id)
    .maybeSingle()
  if (error) return perfilEmCache(id) // offline: usa o último perfil conhecido
  if (data) localStorage.setItem(CHAVE_PERFIL, JSON.stringify(data))
  return data as Perfil | null
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)

  useEffect(() => {
    let ativo = true
    const aplicar = async (s: Session | null) => {
      const p = s ? await carregarPerfil(s.user.id) : null
      if (!ativo) return
      setSessao(s)
      setPerfil(p)
      setCarregando(false)
    }
    supabase.auth.getSession().then(({ data }) => aplicar(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT' || evento === 'USER_UPDATED') {
        // Fora do callback, para não bloquear o cliente de autenticação.
        setTimeout(() => aplicar(s), 0)
      } else if (s) {
        setSessao(s)
      }
    })
    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const sair = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem(CHAVE_PERFIL)
    await limparDadosLocais()
  }

  return <Ctx.Provider value={{ carregando, sessao, perfil, sair }}>{children}</Ctx.Provider>
}

export function useSessao() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSessao fora do SessaoProvider')
  return c
}
