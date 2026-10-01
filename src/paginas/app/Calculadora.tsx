import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import {
  REGRAS_PADRAO,
  calcularJanela,
  calcularTotais,
  type Abertura,
  type RegrasCalculo,
} from '../../lib/calculo/cortinado'
import { Cabecalho, Campo, Erro, Seletor, Vazio, euro, num } from '../../ui/ui'

const numero = (v: string) => Number(v.replace(',', '.'))

export function Calculadora() {
  const confecoes = useLiveQuery(() => db.confecoes.orderBy('ordem').toArray(), [], [])
  const tecidos = useLiveQuery(() => db.tecidos.orderBy('nome').toArray(), [], [])
  const artigos = useLiveQuery(() => db.artigos.toArray(), [], [])
  const params = useLiveQuery(() => db.parametros.toArray(), [], [])

  const regras: RegrasCalculo = {
    ...REGRAS_PADRAO,
    ...((params.find((p) => p.chave === 'calculo')?.valor as Partial<RegrasCalculo>) ?? {}),
  }
  const iva = Number(params.find((p) => p.chave === 'iva_pct')?.valor ?? 23)

  const [largura, setLargura] = useState('')
  const [altura, setAltura] = useState('')
  const [abertura, setAbertura] = useState<Abertura>('central')
  const [quantidade, setQuantidade] = useState('1')
  const [confecaoId, setConfecaoId] = useState('')
  const [tecidoId, setTecidoId] = useState('')
  const [forroId, setForroId] = useState('')
  const [calhaId, setCalhaId] = useState('')
  const [comInstalacao, setComInstalacao] = useState(true)

  const confecao = confecoes.find((c) => c.id === (confecaoId || confecoes[0]?.id))
  const tecido = tecidos.find((t) => t.id === tecidoId)
  const forro = tecidos.find((t) => t.id === forroId)
  const calha = artigos.find((a) => a.id === calhaId)
  const instalacao = artigos.find((a) => a.codigo === 'INSTALACAO')

  const { resultado, erro } = useMemo(() => {
    const l = numero(largura)
    const a = numero(altura)
    if (!(l > 0 && a > 0) || !confecao || !tecido) return { resultado: null, erro: '' }
    try {
      return {
        resultado: calcularJanela({
          janela: { largura_cm: l, altura_cm: a, abertura, quantidade: Number(quantidade) || 1 },
          confecao,
          tecido,
          forro,
          calha,
          instalacao: comInstalacao ? instalacao : null,
          regras,
        }),
        erro: '',
      }
    } catch (e) {
      return { resultado: null, erro: (e as Error).message }
    }
  }, [largura, altura, abertura, quantidade, confecao, tecido, forro, calha, instalacao, comInstalacao, regras])

  if (!confecoes.length) {
    return <Vazio>O catálogo ainda não foi descarregado. Ligue-se à internet e toque em «Sincronizar».</Vazio>
  }

  const tecidosVenda = tecidos.filter((t) => t.tipo !== 'forro')
  const forros = tecidos.filter((t) => t.tipo === 'forro')
  const calhas = artigos.filter((a) => a.tipo === 'calha' || a.tipo === 'varao')
  const totais = resultado ? calcularTotais([resultado.total], 0, iva) : null

  return (
    <>
      <Cabecalho sobrancelha="Calculadora" titulo="Tecido e preço por janela" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="cartao grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Largura da janela (cm)" inputMode="decimal" value={largura} onChange={(e) => setLargura(e.target.value)} autoFocus />
          <Campo rotulo="Altura acabada (cm)" inputMode="decimal" value={altura} onChange={(e) => setAltura(e.target.value)} />
          <Seletor rotulo="Abertura" value={abertura} onChange={(e) => setAbertura(e.target.value as Abertura)}>
            <option value="central">Central (2 folhas)</option>
            <option value="lateral_esq">Lateral esquerda</option>
            <option value="lateral_dir">Lateral direita</option>
          </Seletor>
          <Campo rotulo="Janelas iguais" inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          <Seletor rotulo="Confeção" value={confecao?.id ?? ''} onChange={(e) => setConfecaoId(e.target.value)}>
            {confecoes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} · ×{num(c.fator_franzido, 1)}</option>
            ))}
          </Seletor>
          <Seletor rotulo="Tecido" value={tecidoId} onChange={(e) => setTecidoId(e.target.value)}>
            <option value="">Escolher…</option>
            {tecidosVenda.map((t) => (
              <option key={t.id} value={t.id}>{t.referencia} · {t.nome} ({t.largura_cm} cm)</option>
            ))}
          </Seletor>
          <Seletor rotulo="Forro" value={forroId} onChange={(e) => setForroId(e.target.value)}>
            <option value="">Sem forro</option>
            {forros.map((t) => (
              <option key={t.id} value={t.id}>{t.referencia} · {t.nome}</option>
            ))}
          </Seletor>
          <Seletor rotulo="Calha" value={calhaId} onChange={(e) => setCalhaId(e.target.value)}>
            <option value="">Sem calha</option>
            {calhas.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </Seletor>
          {instalacao && (
            <label className="flex min-h-12 items-center gap-3 sm:col-span-2">
              <input type="checkbox" className="size-5 accent-bronze" checked={comInstalacao} onChange={(e) => setComInstalacao(e.target.checked)} />
              <span className="text-[15px]">Incluir instalação</span>
            </label>
          )}
          {!tecidosVenda.length && (
            <p className="text-[13px] text-cinza sm:col-span-2">Ainda não há tecidos no catálogo. O gestor adiciona-os no backoffice.</p>
          )}
        </div>

        <div className="cartao self-start lg:sticky lg:top-24">
          <Erro>{erro}</Erro>
          {!resultado ? (
            <p className="text-[15px] text-cinza">Introduza as medidas e escolha o tecido.</p>
          ) : (
            <>
              <div className="sobrancelha mb-3">Tecido</div>
              <dl className="grid grid-cols-2 gap-y-1.5 text-[14px]">
                <dt className="text-cinza">Calha</dt><dd className="text-right">{num(resultado.tecido.largura_calha_cm / 100)} m</dd>
                <dt className="text-cinza">Largura de tecido</dt><dd className="text-right">{num(resultado.tecido.largura_necessaria_cm / 100)} m</dd>
                <dt className="text-cinza">Altura de corte</dt><dd className="text-right">{num(resultado.tecido.altura_corte_cm / 100)} m</dd>
                {resultado.tecido.orientacao_usada === 'ao_alto' && (
                  <><dt className="text-cinza">Larguras de rolo</dt><dd className="text-right">{resultado.tecido.larguras}</dd></>
                )}
                <dt className="font-semibold">Metros de tecido</dt><dd className="text-right font-semibold">{num(resultado.tecido.metros)} m</dd>
                {resultado.forro && (
                  <><dt className="font-semibold">Metros de forro</dt><dd className="text-right font-semibold">{num(resultado.forro.metros)} m</dd></>
                )}
              </dl>
              {[...resultado.tecido.avisos, ...(resultado.forro?.avisos ?? [])].map((a) => (
                <p key={a} className="mt-3 rounded-lg bg-linho p-3 text-[13px] text-bronze-esc">{a}</p>
              ))}

              <div className="sobrancelha mb-3 mt-6">Preço por janela</div>
              <table className="w-full text-[14px]">
                <tbody>
                  {resultado.linhas.map((l) => (
                    <tr key={l.rotulo}>
                      <td className="py-1 text-cinza">{l.rotulo}<span className="block text-[12px]">{num(l.quantidade)} {l.unidade} × {euro.format(l.preco_unitario)}</span></td>
                      <td className="py-1 text-right">{euro.format(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 space-y-1 border-t border-linho pt-4 text-[14px]">
                {resultado.quantidade > 1 && (
                  <div className="flex justify-between text-cinza"><span>× {resultado.quantidade} janelas</span><span>{euro.format(resultado.total)}</span></div>
                )}
                <div className="flex justify-between text-cinza"><span>IVA {iva} %</span><span>{euro.format(totais!.iva_valor)}</span></div>
                <div className="flex justify-between pt-1 font-serif text-[26px]"><span>Total</span><span>{euro.format(totais!.total)}</span></div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
