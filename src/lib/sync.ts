import { db, gravarMeta, lerMeta, type Pendente } from './db'
import { supabase } from './supabase'
import type { Cliente } from './tipos'

/** Colunas que o iPad pode escrever em cada tabela. */
const COLUNAS: Record<Pendente['tabela'], string[]> = {
  clientes: ['id', 'nome', 'nif', 'telefone', 'email', 'morada', 'codigo_postal', 'localidade', 'notas', 'criado_por', 'created_at'],
}

const UM_DIA = 24 * 60 * 60 * 1000

let emCurso: Promise<ResultadoSync> | null = null

export interface ResultadoSync {
  enviados: number
  erro?: string
}

function escolher(registo: Record<string, unknown>, colunas: string[]) {
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
    const { error } = await supabase
      .from(p.tabela)
      .upsert(escolher(p.registo, COLUNAS[p.tabela]), { onConflict: 'id' })
    if (error) {
      if (eErroDeRede(error)) throw error
      // Erro de dados ou de permissão: fica na fila, marcado, e segue para o próximo.
      await db.pendentes.update(p.seq!, { tentativas: p.tentativas + 1, erro: error.message })
      continue
    }
    await db.pendentes.delete(p.seq!)
    enviados++
  }
  return enviados
}

async function receberClientes() {
  const cursor = await lerMeta<string>('cursor_clientes')
  const ultimoTotal = (await lerMeta<number>('pull_total_clientes')) ?? 0
  const total = !cursor || Date.now() - ultimoTotal > UM_DIA

  let q = supabase.from('clientes').select('*').order('updated_at', { ascending: true }).limit(1000)
  if (!total && cursor) q = q.gt('updated_at', cursor)
  const { data, error } = await q
  if (error) throw error

  const pendentes = new Set(
    (await db.pendentes.where('tabela').equals('clientes').toArray()).map((p) => p.registo.id as string),
  )
  const recebidos = (data as Cliente[]).filter((c) => !pendentes.has(c.id))

  await db.transaction('rw', db.clientes, async () => {
    if (total) {
      // Remove o que o utilizador deixou de poder ver (exceto alterações por enviar).
      const ids = new Set(recebidos.map((c) => c.id))
      const locais = await db.clientes.toArray()
      await db.clientes.bulkDelete(locais.filter((c) => !ids.has(c.id) && !pendentes.has(c.id)).map((c) => c.id))
    }
    await db.clientes.bulkPut(recebidos)
  })

  const ultimo = (data as Cliente[]).at(-1)?.updated_at
  if (ultimo) await gravarMeta('cursor_clientes', ultimo)
  if (total) await gravarMeta('pull_total_clientes', Date.now())
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
    await Promise.all([receberClientes(), receberCatalogo()])
    await gravarMeta('ultima_sync', new Date().toISOString())
    await gravarMeta('erro_sync', null)
    return { enviados }
  } catch (e) {
    const erro = String((e as { message?: string })?.message ?? e)
    await gravarMeta('erro_sync', erro)
    return { enviados: 0, erro }
  }
}

/** Sincroniza agora. Chamadas simultâneas partilham a mesma execução. */
export function sincronizar(): Promise<ResultadoSync> {
  emCurso ??= executar().finally(() => {
    emCurso = null
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
