import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { formatarCodigoPostal } from '../../../lib/validacao'
import { gravarVisita } from '../../../lib/visitas'
import type { TipoImovel, Visita } from '../../../lib/tipos'
import { Icone } from '../../../ui/icones'
import { EstadoGravacao } from '../../../ui/ui'
import { BarraAcoes, Segmentado } from '../../../ui/visita'
import { useVisita } from './LayoutVisita'

type CamposTexto = 'morada_obra' | 'codigo_postal' | 'localidade' | 'piso' | 'estacionamento' | 'observacoes'

export function Obra() {
  const { visita, cliente } = useVisita()
  const nav = useNavigate()
  const [texto, setTexto] = useState(() =>
    Object.fromEntries(
      (['morada_obra', 'codigo_postal', 'localidade', 'piso', 'estacionamento', 'observacoes'] as CamposTexto[]).map((k) => [k, visita[k] ?? '']),
    ) as Record<CamposTexto, string>,
  )

  const valoresTexto = () =>
    Object.fromEntries(Object.entries(texto).map(([k, v]) => [k, v.trim() || null])) as Partial<Visita>

  const guardar = (extra: Partial<Visita> = {}) => gravarVisita(visita, { ...valoresTexto(), ...extra })

  const campo = (k: CamposTexto, rotulo: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block min-w-0 flex-1">
      <span className="rotulo">{rotulo}</span>
      <input
        className="campo"
        value={texto[k]}
        onChange={(e) => setTexto({ ...texto, [k]: k === 'codigo_postal' ? formatarCodigoPostal(e.target.value) : e.target.value })}
        onBlur={() => void guardar()}
        {...props}
      />
    </label>
  )

  return (
    <>
      <main className="grid flex-1 gap-7 px-6 py-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:px-10">
        <section className="cartao flex flex-col gap-5">
          <h1 className="titulo-serif text-[28px]">Dados da obra</h1>
          {campo('morada_obra', 'Morada da obra', { autoComplete: 'street-address' })}
          <div className="flex gap-4">
            <div className="w-44 shrink-0">{campo('codigo_postal', 'Código postal', { inputMode: 'numeric', placeholder: '0000-000' })}</div>
            {campo('localidade', 'Localidade')}
          </div>
          <Segmentado<TipoImovel>
            rotulo="Tipo de imóvel"
            valor={visita.tipo_imovel}
            aoMudar={(v) => void guardar({ tipo_imovel: v })}
            opcoes={[
              { valor: 'apartamento', rotulo: 'Apartamento' },
              { valor: 'moradia', rotulo: 'Moradia' },
              { valor: 'escritorio', rotulo: 'Escritório' },
              { valor: 'outro', rotulo: 'Outro' },
            ]}
          />
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-28">{campo('piso', 'Piso', { inputMode: 'numeric' })}</div>
            <div className="min-w-48 flex-1">
              <Segmentado<'sim' | 'nao'>
                rotulo="Elevador"
                valor={visita.elevador == null ? null : visita.elevador ? 'sim' : 'nao'}
                aoMudar={(v) => void guardar({ elevador: v === 'sim' })}
                opcoes={[
                  { valor: 'sim', rotulo: 'Sim' },
                  { valor: 'nao', rotulo: 'Não' },
                ]}
              />
            </div>
            {campo('estacionamento', 'Estacionamento', { placeholder: 'Ex.: na rua, garagem' })}
          </div>
          <label className="flex flex-1 flex-col">
            <span className="rotulo">Observações</span>
            <textarea
              className="campo min-h-28 flex-1 resize-none py-3.5 leading-relaxed"
              value={texto.observacoes}
              onChange={(e) => setTexto({ ...texto, observacoes: e.target.value })}
              onBlur={() => void guardar()}
              placeholder="Acessos, tipo de teto, horários, o que for útil para a instalação"
            />
          </label>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="cartao flex flex-col gap-3.5">
            <div className="sobrancelha">Cliente</div>
            <div className="titulo-serif text-[26px]">{cliente?.nome ?? '—'}</div>
            {cliente?.telefone && (
              <a href={`tel:${cliente.telefone}`} className="flex items-center gap-2.5 text-[15px] text-tinta">
                <Icone nome="telefone" tamanho={18} className="text-cinza" />
                {cliente.telefone}
              </a>
            )}
            {cliente?.email && (
              <div className="flex items-center gap-2.5 text-[15px]">
                <Icone nome="email" tamanho={18} className="text-cinza" />
                {cliente.email}
              </div>
            )}
            {cliente?.nif && (
              <div className="flex items-center gap-2.5 text-[15px]">
                <Icone nome="certo" tamanho={18} traco={2.2} className="text-ok" />
                NIF registado
              </div>
            )}
            {!cliente?.email && (
              <p className="rounded-lg bg-linho p-3 text-[13px] text-bronze-esc">
                Falta o email do cliente: é para lá que seguem os documentos assinados.
              </p>
            )}
            {cliente && (
              <Link to={`/app/clientes/${cliente.id}`} className="mt-1 text-[14px] font-semibold text-bronze-esc">
                Editar ficha do cliente
              </Link>
            )}
          </section>
          <section className="flex flex-col gap-3.5 rounded-2xl bg-linho p-6">
            <div className="sobrancelha">Documentos desta visita</div>
            {[
              ['Orçamento e condições gerais', 'Assina no fim da visita'],
              ['Proteção de dados (RGPD)', 'Opcional · associado à ficha'],
              ['Uso de imagens', 'Opcional'],
            ].map(([t, s]) => (
              <div key={t} className="flex items-start gap-3">
                <Icone nome="documento" tamanho={20} className="text-bronze-esc" />
                <div>
                  <div className="text-[15px] font-bold">{t}</div>
                  <div className="text-[13px] text-cinza">{s}</div>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </main>

      <BarraAcoes
        esquerda={
          <Link to="/app" className="btn-grande-sec">
            <Icone nome="esquerda" tamanho={20} />
            Hoje
          </Link>
        }
        estado={<EstadoGravacao />}
        direita={
          <button
            className="btn-grande"
            onClick={async () => {
              await guardar()
              nav(`/app/visitas/${visita.id}/janelas`)
            }}
          >
            Seguinte: janelas
            <Icone nome="direita" tamanho={20} />
          </button>
        }
      />
    </>
  )
}
