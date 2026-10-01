import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import {
  calcularJanelaVisita,
  completa,
  fmtCm,
  gravarJanela,
  medida,
  useCatalogo,
  useJanelas,
} from '../../../lib/visitas'
import type { Tecido } from '../../../lib/tipos'
import { Icone } from '../../../ui/icones'
import { Erro, EstadoGravacao, euro, num } from '../../../ui/ui'
import { BarraAcoes, Pastilha } from '../../../ui/visita'
import { useVisita } from './LayoutVisita'

const semAcentos = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

function CartaoTecido({ tecido, ativo, aoEscolher }: { tecido: Tecido; ativo: boolean; aoEscolher: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoEscolher}
      className={`relative flex flex-col gap-2 rounded-2xl bg-white p-2 text-left ${ativo ? 'border-2 border-bronze' : 'border-[1.5px] border-areia'}`}
    >
      <span
        aria-hidden="true"
        className="block h-14 rounded-[10px] bg-linho"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgb(34 31 27 / .05) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgb(34 31 27 / .05) 0 1px, transparent 1px 5px)',
        }}
      />
      {ativo && (
        <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-bronze text-white">
          <Icone nome="certo" tamanho={15} traco={2.6} />
        </span>
      )}
      <span className="px-1 pb-1">
        <span className="block text-[14px] font-bold leading-snug">{tecido.nome}</span>
        <span className="block text-[12px] text-cinza">
          {tecido.referencia} · {num(tecido.largura_cm, 0)} cm · {euro.format(tecido.preco_venda_m)}/m
        </span>
      </span>
    </button>
  )
}

type Filtro = 'todos' | 'tecido' | 'blackout'

export function Confecao() {
  const { visita } = useVisita()
  const { janelaId } = useParams()
  const nav = useNavigate()
  const janelas = useJanelas(visita.id)
  const cat = useCatalogo()
  const [pesquisa, setPesquisa] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const janela = janelas.find((j) => j.id === janelaId)

  const tecidosVenda = useMemo(() => {
    const q = semAcentos(pesquisa.trim())
    return cat.tecidos
      .filter((t) => t.tipo !== 'forro' && (filtro === 'todos' || t.tipo === filtro))
      .filter((t) => !q || [t.nome, t.referencia, t.colecao].some((v) => v && semAcentos(v).includes(q)))
  }, [cat.tecidos, pesquisa, filtro])
  const forros = cat.tecidos.filter((t) => t.tipo === 'forro')
  const calhas = cat.artigos.filter((a) => a.tipo === 'calha' || a.tipo === 'varao')
  const temInstalacao = cat.artigos.some((a) => a.codigo === 'INSTALACAO')

  if (!janelas.length) return null
  if (!janela) return <Navigate to={`/app/visitas/${visita.id}/janelas`} replace />
  if (!medida(janela)) return <Navigate to={`/app/visitas/${visita.id}/janelas/${janela.id}`} replace />

  const { resultado, erro } = calcularJanelaVisita(janela, cat)
  const confecaoId = janela.confecao_id
  const guardar = (alt: Parameters<typeof gravarJanela>[1]) => void gravarJanela(janela, alt)

  const proxima = janelas.find((j) => j.id !== janela.id && !completa(j))
  const feitas = janelas.filter(completa).length

  if (!cat.confecoes.length) {
    return (
      <main className="flex-1 px-10 py-10">
        <div className="cartao text-[15px] text-cinza">O catálogo ainda não foi descarregado. Ligue-se à internet para sincronizar.</div>
      </main>
    )
  }

  return (
    <>
      <main className="grid flex-1 items-start gap-6 px-6 py-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10">
        <section className="flex min-w-0 flex-col gap-5">
          <div>
            <div className="sobrancelha">
              {janela.divisao} · {janela.designacao || 'Janela'} · {fmtCm(janela.largura_cm)} × {fmtCm(janela.altura_cm)} cm
              {janela.quantidade > 1 ? ` · ${janela.quantidade} iguais` : ''}
            </div>
            <h1 className="titulo-serif text-[28px]">Confeção e tecido</h1>
          </div>

          <div>
            <span className="rotulo">Confeção</span>
            <div className="flex flex-wrap gap-2.5">
              {cat.confecoes.map((c) => (
                <Pastilha key={c.id} ativo={c.id === confecaoId} onClick={() => guardar({ confecao_id: c.id })}>
                  {c.nome}
                </Pastilha>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2.5 flex flex-wrap items-end justify-between gap-3">
              <span className="rotulo mb-0">Tecido</span>
              <div className="flex flex-wrap items-center gap-2">
                {(['todos', 'tecido', 'blackout'] as Filtro[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filtro === f}
                    onClick={() => setFiltro(f)}
                    className={`min-h-10 rounded-full px-3.5 text-[13px] font-semibold ${filtro === f ? 'bg-tinta text-algodao' : 'bg-linho text-tinta'}`}
                  >
                    {f === 'todos' ? 'Todos' : f === 'tecido' ? 'Tecidos' : 'Blackout'}
                  </button>
                ))}
                <label className="flex min-h-11 w-64 items-center gap-2 rounded-xl border-[1.5px] border-areia bg-white px-3">
                  <Icone nome="pesquisa" tamanho={18} className="text-cinza" />
                  <span className="sr-only">Procurar tecido</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                    placeholder="Procurar tecido"
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                  />
                </label>
              </div>
            </div>
            {tecidosVenda.length ? (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {tecidosVenda.map((t) => (
                  <CartaoTecido key={t.id} tecido={t} ativo={t.id === janela.tecido_id} aoEscolher={() => guardar({ tecido_id: t.id })} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-areia p-6 text-center text-[14px] text-cinza">
                {cat.tecidos.length ? 'Nenhum tecido corresponde à pesquisa.' : 'Ainda não há tecidos no catálogo. O gestor adiciona-os no backoffice.'}
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <span className="rotulo">Forro</span>
              <div className="flex flex-wrap gap-2">
                <Pastilha ativo={!janela.forro_id} onClick={() => guardar({ forro_id: null })}>Sem forro</Pastilha>
                {forros.map((f) => (
                  <Pastilha key={f.id} ativo={f.id === janela.forro_id} onClick={() => guardar({ forro_id: f.id })}>
                    {f.nome}
                  </Pastilha>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="rotulo">Calha</span>
              <select
                className="campo appearance-none"
                value={janela.calha_id ?? ''}
                onChange={(e) => guardar({ calha_id: e.target.value || null })}
              >
                <option value="">Sem calha</option>
                {calhas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </label>
          </div>
          {temInstalacao && (
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                className="size-6 accent-tinta"
                checked={janela.com_instalacao}
                onChange={(e) => guardar({ com_instalacao: e.target.checked })}
              />
              <span className="text-[15px] font-semibold">Incluir instalação</span>
            </label>
          )}
        </section>

        <aside className="cartao flex flex-col gap-3 lg:sticky lg:top-6">
          <h2 className="titulo-serif text-[24px]">Cálculo</h2>
          <Erro>{erro}</Erro>
          {!resultado ? (
            <p className="text-[14px] text-cinza">Escolha a confeção e o tecido para ver os metros e o preço.</p>
          ) : (
            <>
              <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-[14px]">
                <dt className="text-cinza">Largura da calha</dt><dd className="text-right tabular-nums">{num(resultado.tecido.largura_calha_cm, 0)} cm</dd>
                <dt className="text-cinza">Fator de franzido</dt><dd className="text-right tabular-nums">{num(cat.confecoes.find((c) => c.id === confecaoId)?.fator_franzido ?? 0, 1)}</dd>
                <dt className="text-cinza">Folhas</dt><dd className="text-right tabular-nums">{resultado.tecido.folhas}</dd>
                <dt className="text-cinza">Tecido</dt><dd className="text-right tabular-nums">{num(resultado.tecido.metros)} m</dd>
                {resultado.forro && (<><dt className="text-cinza">Forro</dt><dd className="text-right tabular-nums">{num(resultado.forro.metros)} m</dd></>)}
              </dl>
              {[...resultado.tecido.avisos, ...(resultado.forro?.avisos ?? [])].map((a) => (
                <p key={a} className="rounded-lg bg-linho p-3 text-[13px] text-bronze-esc">{a}</p>
              ))}
              <div className="my-1 h-px bg-linho" />
              <ul className="flex flex-col gap-1.5 text-[14px]">
                {resultado.linhas.map((l) => (
                  <li key={l.rotulo} className="flex justify-between gap-3">
                    <span className="text-cinza">
                      {l.rotulo}
                      <span className="block text-[12px]">{num(l.quantidade)} {l.unidade} × {euro.format(l.preco_unitario)}</span>
                    </span>
                    <span className="tabular-nums">{euro.format(l.total)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-baseline justify-between rounded-xl bg-linho px-4 py-3.5">
                <span className="text-[14px] font-bold">
                  {resultado.quantidade > 1 ? `${resultado.quantidade} janelas, sem IVA` : 'Esta janela, sem IVA'}
                </span>
                <span className="titulo-serif text-[30px] font-normal text-bronze-esc">{euro.format(resultado.total)}</span>
              </div>
            </>
          )}
          <p className="text-[12px] text-cinza">
            {feitas} de {janelas.length} janelas com confeção e tecido.
          </p>
        </aside>
      </main>

      <BarraAcoes
        esquerda={
          <Link to={`/app/visitas/${visita.id}/janelas/${janela.id}`} className="btn-grande-sec">
            <Icone nome="esquerda" tamanho={20} />
            Medidas
          </Link>
        }
        estado={<EstadoGravacao />}
        direita={
          proxima ? (
            <button
              className="btn-grande"
              onClick={() => nav(`/app/visitas/${visita.id}/janelas/${proxima.id}${medida(proxima) ? '/confecao' : ''}`)}
            >
              Próxima janela · {proxima.divisao}
              <Icone nome="direita" tamanho={20} />
            </button>
          ) : (
            <span className="flex min-h-14 items-center rounded-xl bg-linho px-5 text-[14px] font-semibold text-cinza">
              {completa(janela) ? 'Todas as janelas prontas · orçamento na fase 3' : 'Escolha a confeção e o tecido'}
            </span>
          )
        }
      />
    </>
  )
}
