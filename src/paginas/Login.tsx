import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { supabase, configurado } from '../lib/supabase'
import { useSessao } from '../auth/Sessao'
import { Campo, Erro, Logotipo } from '../ui/ui'

export function Login() {
  const { sessao, carregando } = useSessao()
  const nav = useNavigate()
  const de = (useLocation().state as { de?: string } | null)?.de ?? '/app'
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)

  if (!carregando && sessao) return <Navigate to={de} replace />

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setOcupado(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass })
    setOcupado(false)
    if (error) setErro(error.message === 'Invalid login credentials' ? 'Email ou palavra-passe incorretos.' : error.message)
    else nav(de, { replace: true })
  }

  async function recuperar() {
    setErro('')
    if (!email.trim()) return setErro('Escreva o seu email primeiro.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/definir-palavra-passe`,
    })
    if (error) setErro(error.message)
    else setAviso('Enviámos um email com um link para definir uma nova palavra-passe.')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-5">
        <div className="mb-8 text-center">
          <Logotipo className="text-[30px]" />
          <p className="mt-2 text-[14px] text-cinza">Visitas e orçamentos</p>
        </div>
        {!configurado && (
          <Erro>Falta configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</Erro>
        )}
        <Campo rotulo="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo rotulo="Palavra-passe" type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} />
        <Erro>{erro}</Erro>
        {aviso && <p className="text-[14px] text-ok">{aviso}</p>}
        <button className="btn w-full" disabled={ocupado}>{ocupado ? 'A entrar…' : 'Entrar'}</button>
        <button type="button" className="w-full text-[14px] text-bronze-esc underline-offset-4 hover:underline" onClick={recuperar}>
          Esqueci-me da palavra-passe
        </button>
      </form>
    </div>
  )
}

/** Destino dos links de convite e de recuperação enviados por email. */
export function DefinirPalavraPasse() {
  const { sessao, carregando } = useSessao()
  const nav = useNavigate()
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [erro, setErro] = useState('')

  if (carregando) return null
  if (!sessao) return <Navigate to="/login" replace />

  async function gravar(e: FormEvent) {
    e.preventDefault()
    if (pass.length < 10) return setErro('Use pelo menos 10 caracteres.')
    if (pass !== pass2) return setErro('As palavras-passe não coincidem.')
    const { error } = await supabase.auth.updateUser({ password: pass })
    if (error) setErro(error.message)
    else nav('/app', { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={gravar} className="w-full max-w-sm space-y-5">
        <div className="mb-6 text-center">
          <Logotipo className="text-[30px]" />
          <p className="mt-2 text-[14px] text-cinza">Defina a sua palavra-passe</p>
        </div>
        <Campo rotulo="Nova palavra-passe" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
        <Campo rotulo="Repetir" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
        <Erro>{erro}</Erro>
        <button className="btn w-full">Guardar e entrar</button>
      </form>
    </div>
  )
}
