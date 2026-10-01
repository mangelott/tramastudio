import { useLiveQuery } from 'dexie-react-hooks'
import { db, gravarFotoOffline, gravarOffline } from './db'
import { sincronizar } from './sync'
import { supabase } from './supabase'
import { REGRAS_PADRAO, calcularJanela, type RegrasCalculo, type ResultadoJanela } from './calculo/cortinado'
import type { Artigo, Cliente, Confecao, Foto, JanelaVisita, Tecido, Visita } from './tipos'

const agora = () => new Date().toISOString()

// ---------------------------------------------------------------------
// Visitas
// ---------------------------------------------------------------------

export function novaVisita(cliente: Cliente, tecnicoId: string, agendadaPara: string | null): Visita {
  const t = agora()
  return {
    id: crypto.randomUUID(),
    cliente_id: cliente.id,
    tecnico_id: tecnicoId,
    agendada_para: agendadaPara,
    estado: 'agendada',
    morada_obra: cliente.morada,
    codigo_postal: cliente.codigo_postal,
    localidade: cliente.localidade,
    observacoes: null,
    tipo_imovel: null,
    piso: null,
    elevador: null,
    estacionamento: null,
    iniciada_em: null,
    created_at: t,
    updated_at: t,
    deleted_at: null,
  }
}

export async function gravarVisita(visita: Visita, alteracoes: Partial<Visita> = {}) {
  const base = (await db.visitas.get(visita.id)) ?? visita
  const registo = { ...base, ...alteracoes, updated_at: agora() }
  await gravarOffline('visitas', registo)
  void sincronizar()
  return registo
}

/** Ao abrir a visita pela primeira vez, marca-a como em curso. */
export async function iniciarVisita(visita: Visita) {
  if (visita.estado !== 'agendada') return visita
  return gravarVisita(visita, { estado: 'em_curso', iniciada_em: visita.iniciada_em ?? agora() })
}

/** Visitas não apagadas nem canceladas de um técnico, por data. */
export function useVisitas(tecnicoId: string | undefined) {
  return useLiveQuery(
    async () =>
      tecnicoId
        ? (await db.visitas.toArray())
            .filter((v) => !v.deleted_at && v.tecnico_id === tecnicoId)
            .sort((a, b) => (a.agendada_para ?? a.created_at).localeCompare(b.agendada_para ?? b.created_at))
        : [],
    [tecnicoId],
    [] as Visita[],
  )
}

export function mesmoDia(iso: string | null, dia = new Date()) {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === dia.getFullYear() && d.getMonth() === dia.getMonth() && d.getDate() === dia.getDate()
}

export const hora = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—'

export const dataCurta = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' }).format(new Date(iso)) : '—'

export function moradaCompleta(v: Pick<Visita, 'morada_obra' | 'localidade'>) {
  return [v.morada_obra, v.localidade].filter(Boolean).join(' · ')
}

// ---------------------------------------------------------------------
// Janelas
// ---------------------------------------------------------------------

export function novaJanela(visitaId: string, divisao: string, ordem: number, designacao: string): JanelaVisita {
  const t = agora()
  return {
    id: crypto.randomUUID(),
    visita_id: visitaId,
    divisao,
    designacao,
    largura_cm: null,
    altura_cm: null,
    fixacao: 'teto',
    abertura: 'central',
    observacoes: null,
    ordem,
    confecao_id: null,
    tecido_id: null,
    forro_id: null,
    calha_id: null,
    com_instalacao: true,
    quantidade: 1,
    created_at: t,
    updated_at: t,
    deleted_at: null,
  }
}

/** Grava a janela. `sincronizarJa: false` para edições muito seguidas (ex.: teclado). */
export async function gravarJanela(janela: JanelaVisita, alteracoes: Partial<JanelaVisita> = {}, sincronizarJa = true) {
  // Parte do registo mais recente no iPad, para não desfazer edições feitas entretanto.
  const base = (await db.janelas.get(janela.id)) ?? janela
  const registo = { ...base, ...alteracoes, updated_at: agora() }
  await gravarOffline('janelas', registo)
  if (sincronizarJa) void sincronizar()
  return registo
}

export async function apagarJanela(janela: JanelaVisita) {
  return gravarJanela(janela, { deleted_at: agora() })
}

export function useJanelas(visitaId: string | undefined) {
  return useLiveQuery(
    async () =>
      visitaId
        ? (await db.janelas.where('visita_id').equals(visitaId).toArray())
            .filter((j) => !j.deleted_at)
            .sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at))
        : [],
    [visitaId],
    [] as JanelaVisita[],
  )
}

export interface Divisao {
  nome: string
  janelas: JanelaVisita[]
}

/** Agrupa as janelas por divisão, pela ordem em que as divisões aparecem. */
export function agruparPorDivisao(janelas: JanelaVisita[]): Divisao[] {
  const mapa = new Map<string, JanelaVisita[]>()
  for (const j of janelas) {
    if (!mapa.has(j.divisao)) mapa.set(j.divisao, [])
    mapa.get(j.divisao)!.push(j)
  }
  return [...mapa].map(([nome, js]) => ({ nome, janelas: js }))
}

export const medida = (j: JanelaVisita) => j.largura_cm != null && j.altura_cm != null
export const completa = (j: JanelaVisita) => medida(j) && Boolean(j.confecao_id && j.tecido_id)

export const fmtCm = (cm: number | null) => (cm == null ? '—' : String(cm).replace('.', ','))

// ---------------------------------------------------------------------
// Catálogo e cálculo
// ---------------------------------------------------------------------

export interface Catalogo {
  confecoes: Confecao[]
  tecidos: Tecido[]
  artigos: Artigo[]
  regras: RegrasCalculo
  iva: number
}

export function useCatalogo(): Catalogo {
  const confecoes = useLiveQuery(() => db.confecoes.orderBy('ordem').toArray(), [], [])
  const tecidos = useLiveQuery(() => db.tecidos.orderBy('nome').toArray(), [], [])
  const artigos = useLiveQuery(() => db.artigos.toArray(), [], [])
  const params = useLiveQuery(() => db.parametros.toArray(), [], [])
  const regras: RegrasCalculo = {
    ...REGRAS_PADRAO,
    ...((params.find((p) => p.chave === 'calculo')?.valor as Partial<RegrasCalculo>) ?? {}),
  }
  const iva = Number(params.find((p) => p.chave === 'iva_pct')?.valor ?? 23)
  return { confecoes, tecidos, artigos, regras, iva }
}

/** Calcula uma janela com as escolhas feitas. Devolve null se faltar algo. */
export function calcularJanelaVisita(j: JanelaVisita, cat: Catalogo): { resultado: ResultadoJanela | null; erro: string } {
  const confecao = cat.confecoes.find((c) => c.id === j.confecao_id)
  const tecido = cat.tecidos.find((t) => t.id === j.tecido_id)
  if (!medida(j) || !confecao || !tecido) return { resultado: null, erro: '' }
  try {
    return {
      resultado: calcularJanela({
        janela: { largura_cm: j.largura_cm!, altura_cm: j.altura_cm!, abertura: j.abertura, quantidade: j.quantidade },
        confecao,
        tecido,
        forro: cat.tecidos.find((t) => t.id === j.forro_id) ?? null,
        calha: cat.artigos.find((a) => a.id === j.calha_id) ?? null,
        instalacao: j.com_instalacao ? (cat.artigos.find((a) => a.codigo === 'INSTALACAO') ?? null) : null,
        regras: cat.regras,
      }),
      erro: '',
    }
  } catch (e) {
    return { resultado: null, erro: (e as Error).message }
  }
}

// ---------------------------------------------------------------------
// Fotografias
// ---------------------------------------------------------------------

/** Reduz a fotografia (lado maior 1600 px, JPEG) para poupar espaço e rede. */
export async function comprimirFoto(ficheiro: File, ladoMaximo = 1600, qualidade = 0.8): Promise<Blob> {
  const imagem = await createImageBitmap(ficheiro)
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(imagem.width * escala)
  canvas.height = Math.round(imagem.height * escala)
  canvas.getContext('2d')!.drawImage(imagem, 0, 0, canvas.width, canvas.height)
  imagem.close()
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Não foi possível processar a fotografia.'))), 'image/jpeg', qualidade),
  )
}

export async function adicionarFoto(visitaId: string, janelaId: string | null, ficheiro: File) {
  const blob = await comprimirFoto(ficheiro)
  const id = crypto.randomUUID()
  const t = agora()
  const foto: Foto = {
    id,
    visita_id: visitaId,
    janela_id: janelaId,
    storage_path: `visitas/${visitaId}/${id}.jpg`,
    legenda: null,
    created_at: t,
    updated_at: t,
    deleted_at: null,
  }
  await gravarFotoOffline(foto, blob)
  void sincronizar()
}

export async function apagarFoto(foto: Foto) {
  await gravarOffline('fotos', { ...foto, deleted_at: agora(), updated_at: agora() })
  void sincronizar()
}

export function useFotos(janelaId: string | undefined) {
  return useLiveQuery(
    async () =>
      janelaId
        ? (await db.fotos.where('janela_id').equals(janelaId).toArray())
            .filter((f) => !f.deleted_at)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
        : [],
    [janelaId],
    [] as Foto[],
  )
}

/** URL para mostrar uma fotografia: o ficheiro local ou, sem ele, um link temporário do servidor. */
export async function urlDaFoto(foto: Foto): Promise<string | null> {
  const local = await db.ficheiros.get(foto.id)
  if (local) return URL.createObjectURL(local.blob)
  if (!navigator.onLine) return null
  const { data } = await supabase.storage.from('fotos').createSignedUrl(foto.storage_path, 3600)
  return data?.signedUrl ?? null
}
