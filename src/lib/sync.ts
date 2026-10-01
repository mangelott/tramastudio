import { db, gravarMeta, lerMeta, type Pendente } from './db'
import { supabase } from './supabase'

/** Colunas que o iPad pode escrever em cada tabela. */
export const COLUNAS: Record<Pendente['tabela'], string[]> = {
  clientes: ['id', 'nome', 'nif', 'telefone', 'email', 'morada', 'codigo_postal', 'localidade', 'notas', 'origem', 'criado_por', 'created_at'],
  visitas: [
    'id', 'cliente_id', 'tecnico_id', 'agendada_para', 'estado', 'morada_obra', 'codigo_postal', 'localidade',
    'observacoes', 'tipo_imovel', 'piso', 'elevador', 'estacionamento', 'iniciada_em', 'created_at',
  ],
  janelas: [
    'id', 'visita_id', 'divisao', 'designacao', 'largura_cm', 'altura_cm', 'fixacao', 'abertura', 'observacoes',
    'ordem', 'confecao_id', 'tecido_id', 'forro_id', 'calha_id', 'com_instalacao', 'quantidade', 'created_at', 'deleted_at',
  ],
  fotos: ['id', 'visita_id', 'janela_id', 'storage_path', 'legenda', 'created_at', 'deleted_at'],
}

/** Tabelas que o iPad recebe do servidor, por esta ordem. */
const RECEBIDAS = ['clientes', 'visitas', 'janelas', 'fotos'] as const

const UM_DIA = 24 * 60 * 60 * 1000

let emCurso: Promise<ResultadoSync> | null = null

export interface ResultadoSync {
  enviados: number
  erro?: string
}

export function escolher(registo: Record<string, unknown>, colunas: string[]) {
  return Object.fromEntries(colunas.filter((c) => c in registo).map((c) => [c, registo[c]]))
}

function eErroDeRede(e: unknown) {
  const m = String((e as { message?: string })?.message ?? e)
  return !navigator.onLine || /fetch|network|Failed to fetch|Load failed/i.test(m)
}

async function enviarPendentes(): Promise<number> {
  const fila = await db.pendentes.orderBy('seq').toArray()
  let enviados = 0
  for (const p of fila) {
    if (p.tabela === 'fotos') {
      const erroFicheiro = await enviarFicheiroFoto(p.registo.id as string, p.registo.storage_path as string)
      if (erroFicheiro) {
        if (eErroDeRede(erroFicheiro)) throw erroFicheiro
        await db.pendentes.update(p.seq!, { tentativas: p.tentativas + 1, erro: erroFicheiro.message })
        continue
      }
    }
    const { error } = await supabase
      .from(p.tabela)
      .upsert(escolher(p.registo, COLUNAS[p.tabela]), { onConflict: 'id' })
    if (error) {
      if (eErroDeRede(error)) throw error
      // Erro de dados ou de permissão: fica na fila, marcado, e segue para o próximo.
      await db.pendentes.update(p.seq!, { tentativas: p.tentativas + 1, erro: error.message })
      continue
    }
    // Só sai da fila se não tiver sido editado entretanto (senão segue na próxima volta).
    await db.transaction('rw', db.pendentes, async () => {
      const atual = await db.pendentes.get(p.seq!)
      if (atual && JSON.stringify(atual.registo) === JSON.stringify(p.registo)) await db.pendentes.delete(p.seq!)
    })
    enviados++
  }
  return enviados
}

/** Envia o ficheiro de uma fotografia, se ainda não foi enviado. */
async function enviarFicheiroFoto(id: string, caminho: string): Promise<{ message: string } | null> {
  const f = await db.ficheiros.get(id)
  if (!f || f.enviado) return null
  const { error } = await supabase.storage
    .from('fotos')
    .upload(caminho, f.blob, { contentType: f.blob.type || 'image/jpeg', upsert: true })
  if (error) return error
  await db.ficheiros.update(id, { enviado: 1 })
  return null
}

type Recebida = (typeof RECEBIDAS)[number]
type ComId = { id: string; updated_at: string }

/**
 * Recebe as alterações de uma tabela desde a última vez.
 * Uma vez por dia recebe tudo, para retirar do iPad o que o utilizador deixou de poder ver.
 */
async function receber(tabela: Recebida) {
  const cursor = await lerMeta<string>(`cursor_${tabela}`)
  const ultimoTotal = (await lerMeta<number>(`pull_total_${tabela}`)) ?? 0
  const total = !cursor || Date.now() - ultimoTotal > UM_DIA

  const recebidos: ComId[] = []
  // Páginas de 1000, ordenadas por updated_at e id, para não perder registos com o mesmo instante.
  for (let pagina = 0; ; pagina++) {
    let q = supabase.from(tabela).select('*').order('updated_at', { ascending: true }).order('id').range(pagina * 1000, pagina * 1000 + 999)
    if (!total && cursor) q = q.gte('updated_at', cursor)
    const { data, error } = await q
    if (error) throw error
    recebidos.push(...(data as ComId[]))
    if (!data || data.length < 1000) break
  }

  const pendentes = new Set(
    (await db.pendentes.where('tabela').equals(tabela).toArray()).map((p) => p.registo.id as string),
  )
  const aGravar = recebidos.filter((r) => !pendentes.has(r.id))
  const t = db.table<ComId, string>(tabela)

  await db.transaction('rw', t, async () => {
    if (total) {
      const ids = new Set(recebidos.map((r) => r.id))
      const locais = await t.toCollection().primaryKeys()
      await t.bulkDelete(locais.filter((id) => !ids.has(id) && !pendentes.has(id)))
    }
    await t.bulkPut(aGravar)
  })

  const ultimo = recebidos.at(-1)?.updated_at
  if (ultimo) await gravarMeta(`cursor_${tabela}`, ultimo)
  if (total) await gravarMeta(`pull_total_${tabela}`, Date.now())
}

/** Catálogo e parâmetros: pequenos, substituídos por inteiro. */
async function receberCatalogo() {
  const [tecidos, confecoes, artigos, parametros] = await Promise.all([
    supabase.from('tecidos').select('*').eq('ativo', true),
    supabase.from('confecoes').select('*').eq('ativo', true).order('ordem'),
    supabase.from('artigos').select('*').eq('ativo', true),
    supabase.from('parametros').select('chave, valor, descricao, publico'),
  ])
  for (const r of [tecidos, confecoes, artigos, parametros]) if (r.error) throw r.error

  await db.transaction('rw', [db.tecidos, db.confecoes, db.artigos, db.parametros], async () => {
    await db.tecidos.clear()
    await db.tecidos.bulkPut(tecidos.data!)
    await db.confecoes.clear()
    await db.confecoes.bulkPut(confecoes.data!)
    await db.artigos.clear()
    await db.artigos.bulkPut(artigos.data!)
    await db.parametros.clear()
    await db.parametros.bulkPut(parametros.data!)
  })
}

async function executar(): Promise<ResultadoSync> {
  if (!navigator.onLine) return { enviados: 0, erro: 'Sem ligação' }
  try {
    const enviados = await enviarPendentes()
    for (const t of RECEBIDAS) await receber(t)
    await receberCatalogo()
    await gravarMeta('ultima_sync', new Date().toISOString())
    await gravarMeta('erro_sync', null)
    return { enviados }
  } catch (e) {
    const erro = String((e as { message?: string })?.message ?? e)
    await gravarMeta('erro_sync', erro)
    return { enviados: 0, erro }
  }
}

let repetir = false

/**
 * Sincroniza agora. Chamadas simultâneas partilham a mesma execução; se houver
 * gravações durante uma execução, segue-se logo outra, para não esperarem pelo minuto seguinte.
 */
export function sincronizar(): Promise<ResultadoSync> {
  if (emCurso) {
    repetir = true
    return emCurso
  }
  emCurso = executar().finally(() => {
    emCurso = null
    if (repetir) {
      repetir = false
      void sincronizar()
    }
  })
  return emCurso
}

/** Sincroniza ao arrancar, ao voltar a ter rede, ao voltar à app e de minuto a minuto. */
export function iniciarSincronizacaoAutomatica(): () => void {
  const agora = () => void sincronizar()
  const visivel = () => document.visibilityState === 'visible' && agora()
  window.addEventListener('online', agora)
  document.addEventListener('visibilitychange', visivel)
  const t = window.setInterval(() => document.visibilityState === 'visible' && agora(), 60_000)
  agora()
  return () => {
    window.removeEventListener('online', agora)
    document.removeEventListener('visibilitychange', visivel)
    window.clearInterval(t)
  }
}
