import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icone } from './icones'
import { aplicarTecla, type Tecla } from '../lib/teclado'

/** Escolha única em botões lado a lado (ex.: Teto / Parede). */
export function Segmentado<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string
  opcoes: { valor: T; rotulo: string }[]
  valor: T | null | undefined
  aoMudar: (v: T) => void
}) {
  return (
    <div>
      <span className="rotulo">{rotulo}</span>
      <div role="radiogroup" aria-label={rotulo} className="flex rounded-xl bg-linho p-1">
        {opcoes.map((o) => {
          const ativo = o.valor === valor
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoMudar(o.valor)}
              className={`min-h-11 flex-1 rounded-[9px] px-4 text-[15px] font-semibold transition ${
                ativo ? 'bg-white text-tinta shadow-[0_1px_2px_rgb(34_31_27/.12)]' : 'text-cinza'
              }`}
            >
              {o.rotulo}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Botão em forma de pastilha, para escolhas rápidas (confeção, filtros). */
export function Pastilha({ ativo, children, onClick }: { ativo: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`min-h-12 rounded-full border-[1.5px] px-5 text-[15px] font-semibold transition ${
        ativo ? 'border-tinta bg-tinta text-algodao' : 'border-areia bg-white text-tinta'
      }`}
    >
      {children}
    </button>
  )
}

export const PASSOS_VISITA = [
  { id: 'obra', rotulo: 'Obra' },
  { id: 'janelas', rotulo: 'Janelas' },
  { id: 'orcamento', rotulo: 'Orçamento' },
  { id: 'assinatura', rotulo: 'Assinatura' },
] as const
export type PassoVisita = (typeof PASSOS_VISITA)[number]['id']

/** Indicador de passos da visita. Os passos ainda não disponíveis ficam inativos. */
export function Passos({
  atual,
  visitaId,
  disponiveis = ['obra', 'janelas'],
}: {
  atual: PassoVisita
  visitaId: string
  disponiveis?: PassoVisita[]
}) {
  const iAtual = PASSOS_VISITA.findIndex((p) => p.id === atual)
  return (
    <ol className="flex items-center gap-2" aria-label="Passos da visita">
      {PASSOS_VISITA.map((p, i) => {
        const feito = i < iAtual
        const ativo = i === iAtual
        const pode = disponiveis.includes(p.id)
        const bola = feito ? (
          <span className="flex size-7 items-center justify-center rounded-full bg-bronze text-white">
            <Icone nome="certo" tamanho={16} traco={2.4} />
          </span>
        ) : (
          <span
            className={`flex size-7 items-center justify-center rounded-full text-[13px] font-bold ${
              ativo ? 'bg-tinta text-algodao' : 'border-[1.5px] border-areia text-cinza'
            }`}
          >
            {i + 1}
          </span>
        )
        const conteudo = (
          <>
            {bola}
            <span>{p.rotulo}</span>
          </>
        )
        const classe = `flex min-h-11 items-center gap-2.5 px-2 text-[14px] font-semibold ${
          feito || ativo ? 'text-tinta' : 'text-cinza'
        }`
        return (
          <li key={p.id} className="flex items-center gap-2">
            {pode ? (
              <Link to={`/app/visitas/${visitaId}/${p.id}`} aria-current={ativo ? 'step' : undefined} className={classe}>
                {conteudo}
              </Link>
            ) : (
              <span className={`${classe} opacity-60`} title="Disponível na próxima fase">
                {conteudo}
              </span>
            )}
            {i < PASSOS_VISITA.length - 1 && (
              <span aria-hidden="true" className={`h-[1.5px] w-7 ${feito ? 'bg-bronze' : 'bg-areia'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Teclado numérico grande, para introduzir as medidas do medidor laser. */
export function TecladoNumerico({
  valor,
  aoMudar,
}: {
  valor: string
  aoMudar: (v: string) => void
}) {
  const teclas: Tecla[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'apagar']
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {teclas.map((t) => (
        <button
          key={t}
          type="button"
          aria-label={t === 'apagar' ? 'Apagar' : t}
          onClick={() => aoMudar(aplicarTecla(valor, t))}
          className="flex min-h-16 items-center justify-center rounded-xl border-[1.5px] border-areia bg-white text-[26px] font-semibold text-tinta transition active:scale-[.97] active:bg-linho"
        >
          {t === 'apagar' ? <Icone nome="apagar" tamanho={28} /> : t}
        </button>
      ))}
    </div>
  )
}

/** Barra fixa no fundo do ecrã da visita: voltar, estado e seguinte. */
export function BarraAcoes({ esquerda, direita, estado }: { esquerda?: ReactNode; direita?: ReactNode; estado?: ReactNode }) {
  return (
    <footer className="sticky bottom-0 z-10 flex min-h-[88px] items-center justify-between gap-4 border-t border-areia bg-algodao/95 px-6 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:px-10">
      <div>{esquerda}</div>
      <div className="flex items-center gap-5">
        {estado}
        {direita}
      </div>
    </footer>
  )
}
