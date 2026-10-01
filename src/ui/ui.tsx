import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { sincronizar } from '../lib/sync'

export const euro = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
export const num = (v: number, casas = 2) =>
  new Intl.NumberFormat('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v)

export function Logotipo({ className = '' }: { className?: string }) {
  // Substituir por public/logotipo.svg (pacote de marca, 01_Logotipo_Horizontal) quando disponível.
  return (
    <span className={`font-serif text-[22px] font-light tracking-tight text-tinta ${className}`}>
      Trama <span className="text-bronze">Studio</span>
    </span>
  )
}

export function Ecra({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center text-cinza">
      <Logotipo />
      <div>{children}</div>
    </div>
  )
}

export function Campo({
  rotulo,
  ajuda,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { rotulo: string; ajuda?: string }) {
  return (
    <label className="block">
      <span className="rotulo">{rotulo}</span>
      <input className="campo" {...props} />
      {ajuda && <span className="mt-1 block text-[12px] text-cinza-claro">{ajuda}</span>}
    </label>
  )
}

export function Seletor({
  rotulo,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { rotulo: string }) {
  return (
    <label className="block">
      <span className="rotulo">{rotulo}</span>
      <select className="campo appearance-none bg-[length:12px] pr-10" {...props}>
        {children}
      </select>
    </label>
  )
}

export function Cabecalho({ sobrancelha, titulo, acoes }: { sobrancelha?: string; titulo: string; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {sobrancelha && <div className="sobrancelha mb-1">{sobrancelha}</div>}
        <h1 className="text-[34px] leading-tight">{titulo}</h1>
      </div>
      {acoes && <div className="flex gap-2">{acoes}</div>}
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-areia p-10 text-center text-cinza">{children}</div>
}

export function Erro({ children }: { children: ReactNode }) {
  if (!children) return null
  return <div className="rounded-lg border border-erro/30 bg-erro/5 p-3 text-[14px] text-erro">{children}</div>
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** Estado da rede e da fila de envio, partilhado pelos indicadores de sincronização. */
export function useEstadoSync() {
  const online = useOnline()
  const pendentes = useLiveQuery(() => db.pendentes.count(), [], 0)
  const comErro = useLiveQuery(() => db.pendentes.filter((p) => Boolean(p.erro)).count(), [], 0)
  const [aSincronizar, setASincronizar] = useState(false)

  const cor = !online ? 'bg-cinza-claro' : comErro ? 'bg-erro' : pendentes ? 'bg-bronze' : 'bg-salva'
  const texto = !online
    ? pendentes ? `Offline · ${pendentes} por enviar` : 'Offline'
    : comErro ? `${comErro} com erro` : pendentes ? `${pendentes} por enviar` : 'Sincronizado'

  async function sincronizarAgora() {
    setASincronizar(true)
    await sincronizar()
    setASincronizar(false)
  }
  return { online, pendentes, comErro, cor, texto, aSincronizar, sincronizarAgora }
}

/** Indicador de rede e de alterações por enviar. Toque para sincronizar. */
export function EstadoSync() {
  const { cor, texto, aSincronizar, sincronizarAgora } = useEstadoSync()
  return (
    <button
      className="flex min-h-10 items-center gap-2 rounded-full border border-linho bg-white px-3 text-[13px] font-semibold text-cinza"
      onClick={sincronizarAgora}
      title="Sincronizar agora"
    >
      <span className={`size-2.5 rounded-full ${cor} ${aSincronizar ? 'animate-pulse' : ''}`} />
      {aSincronizar ? 'A sincronizar…' : texto}
    </button>
  )
}

/** Linha discreta com o estado de gravação, para a barra de ações da visita. */
export function EstadoGravacao() {
  const { online, pendentes, cor } = useEstadoSync()
  const texto = pendentes
    ? online ? 'Guardado neste iPad · a enviar' : 'Guardado neste iPad · envia quando houver rede'
    : 'Guardado e sincronizado'
  return (
    <span className="hidden items-center gap-2 text-[13px] font-semibold text-cinza md:flex">
      <span className={`size-2 rounded-full ${cor}`} />
      {texto}
    </span>
  )
}
