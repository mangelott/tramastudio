import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { cmParaTexto, textoParaCm } from '../../../lib/teclado'
import {
  adicionarFoto,
  agruparPorDivisao,
  apagarFoto,
  apagarJanela,
  completa,
  fmtCm,
  gravarJanela,
  medida,
  novaJanela,
  urlDaFoto,
  useFotos,
  useJanelas,
} from '../../../lib/visitas'
import type { Abertura, Fixacao, Foto, JanelaVisita } from '../../../lib/tipos'
import { sincronizar } from '../../../lib/sync'
import { Icone } from '../../../ui/icones'
import { Erro, EstadoGravacao } from '../../../ui/ui'
import { BarraAcoes, Segmentado, TecladoNumerico } from '../../../ui/visita'
import { useVisita } from './LayoutVisita'

const SUGESTOES = ['Sala', 'Quarto principal', 'Quarto', 'Escritório', 'Cozinha', 'Casa de banho']

// ---------------------------------------------------------------------
// Lista de divisões
// ---------------------------------------------------------------------

function NovaDivisao({ existentes, aoCriar, aoCancelar }: { existentes: string[]; aoCriar: (nome: string) => void; aoCancelar: () => void }) {
  const [nome, setNome] = useState('')
  const sugerir = (base: string) => {
    if (!existentes.includes(base)) return base
    let n = 2
    while (existentes.includes(`${base} ${n}`)) n++
    return `${base} ${n}`
  }
  return (
    <div className="rounded-2xl border-[1.5px] border-bronze bg-white p-3.5">
      <label className="block">
        <span className="rotulo">Nova divisão</span>
        <input
          className="campo min-h-12"
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && nome.trim() && aoCriar(nome.trim())}
          placeholder="Nome da divisão"
        />
      </label>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SUGESTOES.map((s) => (
          <button key={s} type="button" onClick={() => aoCriar(sugerir(s))} className="min-h-10 rounded-full bg-linho px-3 text-[13px] font-semibold">
            {s}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn min-h-11 flex-1" disabled={!nome.trim()} onClick={() => aoCriar(nome.trim())}>
          Criar
        </button>
        <button type="button" className="btn-sec min-h-11" onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function ListaDivisoes({ visitaId, janelas, atual }: { visitaId: string; janelas: JanelaVisita[]; atual?: JanelaVisita }) {
  const nav = useNavigate()
  const [aCriar, setACriar] = useState(false)
  const divisoes = agruparPorDivisao(janelas)
  const proximaOrdem = () => (janelas.at(-1)?.ordem ?? 0) + 1

  async function criarDivisao(nome: string) {
    const j = await gravarJanela(novaJanela(visitaId, nome, proximaOrdem(), 'Janela 1'))
    setACriar(false)
    nav(`/app/visitas/${visitaId}/janelas/${j.id}`)
  }

  async function adicionarJanela(divisao: string, n: number) {
    // Mantém as janelas da divisão juntas: a nova fica logo a seguir à última da divisão
    // e as das divisões seguintes descem uma posição.
    const ultima = janelas.filter((j) => j.divisao === divisao).at(-1)!
    for (const j of janelas.filter((x) => x.ordem > ultima.ordem)) await gravarJanela(j, { ordem: j.ordem + 1 }, false)
    const j = await gravarJanela(novaJanela(visitaId, divisao, ultima.ordem + 1, `Janela ${n + 1}`))
    nav(`/app/visitas/${visitaId}/janelas/${j.id}`)
  }

  return (
    <nav aria-label="Divisões" className="flex flex-col gap-2">
      <div className="sobrancelha mb-1">Divisões</div>
      {divisoes.map((d) => {
        const selecionada = d.nome === atual?.divisao
        const medidas = d.janelas.filter(medida).length
        return (
          <div key={d.nome} className={`rounded-2xl border-[1.5px] p-3 ${selecionada ? 'border-bronze bg-white' : 'border-transparent'}`}>
            <Link to={`/app/visitas/${visitaId}/janelas/${d.janelas[0].id}`} className="flex min-h-11 flex-col justify-center px-1">
              <span className="text-[16px] font-bold">{d.nome}</span>
              <span className="text-[13px] text-cinza">
                {d.janelas.length === 1 ? '1 janela' : `${d.janelas.length} janelas`}
                {medidas < d.janelas.length ? ` · ${d.janelas.length - medidas} por medir` : ''}
              </span>
            </Link>
            {selecionada && (
              <div className="mt-2 flex flex-col gap-0.5">
                {d.janelas.map((j) => {
                  const ativa = j.id === atual?.id
                  return (
                    <Link
                      key={j.id}
                      to={`/app/visitas/${visitaId}/janelas/${j.id}`}
                      aria-current={ativa ? 'page' : undefined}
                      className={`flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-[14px] ${ativa ? 'bg-linho font-bold' : 'font-medium'}`}
                    >
                      {completa(j) ? (
                        <Icone nome="certo" tamanho={16} traco={2.4} className="text-ok" />
                      ) : (
                        <span className="mx-1 size-2 rounded-full bg-bronze" />
                      )}
                      <span className="truncate">
                        {j.designacao || 'Janela'} · {medida(j) ? `${fmtCm(j.largura_cm)} × ${fmtCm(j.altura_cm)}` : 'a medir'}
                      </span>
                    </Link>
                  )
                })}
                <button
                  type="button"
                  onClick={() => adicionarJanela(d.nome, d.janelas.length)}
                  className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-[14px] font-semibold text-bronze-esc"
                >
                  <Icone nome="mais" tamanho={16} />
                  Janela
                </button>
              </div>
            )}
          </div>
        )
      })}
      {aCriar ? (
        <NovaDivisao existentes={divisoes.map((d) => d.nome)} aoCriar={criarDivisao} aoCancelar={() => setACriar(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setACriar(true)}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-areia text-[15px] font-semibold text-bronze-esc"
        >
          <Icone nome="mais" tamanho={18} />
          Adicionar divisão
        </button>
      )}
    </nav>
  )
}

// ---------------------------------------------------------------------
// Fotografias
// ---------------------------------------------------------------------

function Miniatura({ foto }: { foto: Foto }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let ativo = true
    let criado: string | null = null
    void urlDaFoto(foto).then((u) => {
      if (u?.startsWith('blob:')) criado = u
      if (ativo) setUrl(u)
    })
    return () => {
      ativo = false
      if (criado) URL.revokeObjectURL(criado)
    }
  }, [foto])
  return (
    <div className="relative size-[100px] overflow-hidden rounded-xl bg-linho">
      {url ? (
        <img src={url} alt={foto.legenda ?? 'Fotografia da janela'} className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center text-bronze-esc">
          <Icone nome="imagem" tamanho={22} />
        </div>
      )}
      <button
        type="button"
        aria-label="Apagar fotografia"
        onClick={() => confirm('Apagar esta fotografia?') && void apagarFoto(foto)}
        className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-tinta/70 text-white"
      >
        <Icone nome="fechar" tamanho={16} traco={2.2} />
      </button>
    </div>
  )
}

function Fotos({ visitaId, janelaId }: { visitaId: string; janelaId: string }) {
  const fotos = useFotos(janelaId)
  const [aProcessar, setAProcessar] = useState(false)
  const [erro, setErro] = useState('')
  return (
    <div>
      <span className="rotulo">Fotografias</span>
      <div className="flex flex-wrap items-center gap-3">
        {fotos.map((f) => (
          <Miniatura key={f.id} foto={f} />
        ))}
        <label className="flex size-[100px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-bronze text-[13px] font-bold text-bronze-esc">
          <Icone nome="camera" tamanho={24} />
          {aProcessar ? 'A guardar…' : 'Tirar foto'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setAProcessar(true)
              setErro('')
              try {
                await adicionarFoto(visitaId, janelaId, f)
              } catch (err) {
                setErro((err as Error).message)
              } finally {
                setAProcessar(false)
              }
            }}
          />
        </label>
      </div>
      <div className="mt-2"><Erro>{erro}</Erro></div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Ecrã de medição
// ---------------------------------------------------------------------

type CampoMedida = 'largura' | 'altura'

function CampoMedida({ rotulo, valor, ativo, aoTocar }: { rotulo: string; valor: string; ativo: boolean; aoTocar: () => void }) {
  return (
    <button type="button" onClick={aoTocar} aria-pressed={ativo} className="block flex-1 text-left">
      <span className="rotulo">{rotulo}</span>
      <span
        className={`flex h-16 items-center justify-between rounded-xl bg-white px-4 text-[22px] font-semibold ${
          ativo ? 'border-2 border-bronze' : 'border-[1.5px] border-areia'
        }`}
      >
        <span className={valor ? 'text-tinta' : 'text-cinza-claro'}>{valor || '—'}</span>
        <span className="text-[15px] font-normal text-cinza">cm</span>
      </span>
    </button>
  )
}

function Medicao({ janela, visitaId, todas }: { janela: JanelaVisita; visitaId: string; todas: JanelaVisita[] }) {
  const nav = useNavigate()
  const [campo, setCampo] = useState<CampoMedida>(janela.largura_cm == null ? 'largura' : janela.altura_cm == null ? 'altura' : 'largura')
  const [largura, setLargura] = useState(cmParaTexto(janela.largura_cm))
  const [altura, setAltura] = useState(cmParaTexto(janela.altura_cm))
  const [designacao, setDesignacao] = useState(janela.designacao ?? '')
  const valor = campo === 'largura' ? largura : altura
  const mudarValor = (v: string) => {
    const l = campo === 'largura' ? v : largura
    const a = campo === 'altura' ? v : altura
    setLargura(l)
    setAltura(a)
    void gravarJanela(janela, { largura_cm: textoParaCm(l), altura_cm: textoParaCm(a) }, false)
  }

  const naDivisao = todas.filter((j) => j.divisao === janela.divisao)

  async function seguinte() {
    if (campo === 'largura') {
      setCampo('altura')
      return
    }
    void sincronizar()
    nav(`/app/visitas/${visitaId}/janelas/${janela.id}/confecao`)
  }

  return (
    <>
      <section className="cartao flex min-w-0 flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="titulo-serif text-[28px]">
            {janela.divisao} · {janela.designacao || 'Janela'}
          </h1>
          <button
            type="button"
            className="flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-erro"
            onClick={async () => {
              if (!confirm(`Apagar «${janela.designacao || 'Janela'}» da ${janela.divisao}?`)) return
              await apagarJanela(janela)
              const outra = todas.find((j) => j.id !== janela.id)
              nav(outra ? `/app/visitas/${visitaId}/janelas/${outra.id}` : `/app/visitas/${visitaId}/janelas`, { replace: true })
            }}
          >
            <Icone nome="lixo" tamanho={18} />
            Apagar
          </button>
        </div>
        <div className="flex gap-4">
          <label className="block flex-1">
            <span className="rotulo">Identificação</span>
            <input
              className="campo"
              value={designacao}
              placeholder="Ex.: porta da varanda"
              onChange={(e) => setDesignacao(e.target.value)}
              onBlur={() => void gravarJanela(janela, { designacao: designacao.trim() || null })}
            />
          </label>
          <div className="w-40">
            <span className="rotulo">Janelas iguais</span>
            <div className="flex h-[52px] items-center justify-between rounded-xl border-[1.5px] border-areia bg-white">
              <button type="button" aria-label="Menos uma" className="h-full w-12 text-[22px]" onClick={() => void gravarJanela(janela, { quantidade: Math.max(1, janela.quantidade - 1) })}>−</button>
              <span className="text-[17px] font-semibold">{janela.quantidade}</span>
              <button type="button" aria-label="Mais uma" className="h-full w-12 text-[22px]" onClick={() => void gravarJanela(janela, { quantidade: janela.quantidade + 1 })}>+</button>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-4">
          <CampoMedida rotulo="Largura" valor={largura} ativo={campo === 'largura'} aoTocar={() => setCampo('largura')} />
          <span className="pb-5 text-[20px] text-cinza">×</span>
          <CampoMedida rotulo="Altura" valor={altura} ativo={campo === 'altura'} aoTocar={() => setCampo('altura')} />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-48 flex-1">
            <Segmentado<Fixacao>
              rotulo="Fixação"
              valor={janela.fixacao}
              aoMudar={(v) => void gravarJanela(janela, { fixacao: v })}
              opcoes={[
                { valor: 'teto', rotulo: 'Teto' },
                { valor: 'parede', rotulo: 'Parede' },
              ]}
            />
          </div>
          <div className="min-w-72 flex-[1.6]">
            <Segmentado<Abertura>
              rotulo="Abertura"
              valor={janela.abertura}
              aoMudar={(v) => void gravarJanela(janela, { abertura: v })}
              opcoes={[
                { valor: 'central', rotulo: 'Central' },
                { valor: 'lateral_esq', rotulo: 'Esquerda' },
                { valor: 'lateral_dir', rotulo: 'Direita' },
              ]}
            />
          </div>
        </div>
        <Fotos visitaId={visitaId} janelaId={janela.id} />
        {naDivisao.length > 1 && (
          <p className="text-[13px] text-cinza">
            {janela.divisao}: {naDivisao.filter(medida).length} de {naDivisao.length} janelas medidas.
          </p>
        )}
      </section>

      <aside aria-label="Teclado numérico" className="flex flex-col gap-3.5 rounded-2xl bg-linho p-5">
        <div>
          <div className="sobrancelha">A introduzir · {campo === 'largura' ? 'Largura' : 'Altura'}</div>
          <div className="flex items-baseline gap-2">
            <span className="titulo-serif text-[56px] leading-none">{valor || '0'}</span>
            <span className="text-[18px] text-cinza">cm</span>
          </div>
          <p className="mt-1 text-[13px] text-cinza">Leia o medidor laser e escreva o valor.</p>
        </div>
        <TecladoNumerico valor={valor} aoMudar={mudarValor} />
        <button type="button" className="btn-grande" onClick={seguinte} disabled={campo === 'altura' && !(textoParaCm(largura) && textoParaCm(altura))}>
          {campo === 'largura' ? 'Seguinte: altura' : 'Seguinte: confeção'}
          <Icone nome="direita" tamanho={20} />
        </button>
      </aside>
    </>
  )
}

export function Janelas() {
  const { visita } = useVisita()
  const { janelaId } = useParams()
  const janelas = useJanelas(visita.id)
  const atual = janelas.find((j) => j.id === janelaId)

  // Sem janela escolhida: abre a primeira por completar.
  if (!janelaId && janelas.length) {
    const alvo = janelas.find((j) => !completa(j)) ?? janelas[0]
    return <Navigate to={`/app/visitas/${visita.id}/janelas/${alvo.id}`} replace />
  }

  return (
    <>
      <main className="grid flex-1 items-start gap-6 px-6 py-7 lg:grid-cols-[232px_minmax(0,1fr)_312px] lg:px-10">
        <ListaDivisoes visitaId={visita.id} janelas={janelas} atual={atual} />
        {atual ? (
          <Medicao key={atual.id} janela={atual} visitaId={visita.id} todas={janelas} />
        ) : (
          <section className="cartao col-span-2 flex flex-col items-center gap-3 py-14 text-center">
            <h1 className="titulo-serif text-[28px]">{janelaId ? 'Janela não encontrada' : 'Comece por uma divisão'}</h1>
            <p className="max-w-md text-[15px] text-cinza">
              Crie a primeira divisão à esquerda (sala, quarto…) e meça as janelas uma a uma.
            </p>
          </section>
        )}
      </main>
      <BarraAcoes
        esquerda={
          <Link to={`/app/visitas/${visita.id}/obra`} className="btn-grande-sec">
            <Icone nome="esquerda" tamanho={20} />
            Obra
          </Link>
        }
        estado={<EstadoGravacao />}
        direita={
          atual && (
            <Link to={`/app/visitas/${visita.id}/janelas/${atual.id}/confecao`} className="btn-grande">
              Confeção e tecido
              <Icone nome="direita" tamanho={20} />
            </Link>
          )
        }
      />
    </>
  )
}
