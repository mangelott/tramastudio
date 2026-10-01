import Dexie, { type EntityTable } from 'dexie'
import type { Artigo, Cliente, Confecao, Parametro, Tecido } from './tipos'

/** Alteração feita no iPad, à espera de ser enviada ao servidor. */
export interface Pendente {
  seq?: number
  tabela: TabelaSincronizada
  registo: Record<string, unknown>
  criado_em: string
  tentativas: number
  erro?: string
}

export type TabelaSincronizada = 'clientes'

export interface Meta {
  chave: string
  valor: unknown
}

class BaseLocal extends Dexie {
  clientes!: EntityTable<Cliente, 'id'>
  tecidos!: EntityTable<Tecido, 'id'>
  confecoes!: EntityTable<Confecao, 'id'>
  artigos!: EntityTable<Artigo, 'id'>
  parametros!: EntityTable<Parametro, 'chave'>
  pendentes!: EntityTable<Pendente, 'seq'>
  meta!: EntityTable<Meta, 'chave'>

  constructor() {
    super('trama')
    this.version(1).stores({
      clientes: 'id, nome, updated_at, deleted_at',
      tecidos: 'id, referencia, nome, tipo, ativo',
      confecoes: 'id, codigo, ordem',
      artigos: 'id, codigo, tipo',
      parametros: 'chave',
      pendentes: '++seq, tabela',
      meta: 'chave',
    })
  }
}

export const db = new BaseLocal()

export async function lerMeta<T>(chave: string): Promise<T | undefined> {
  return (await db.meta.get(chave))?.valor as T | undefined
}

export async function gravarMeta(chave: string, valor: unknown) {
  await db.meta.put({ chave, valor })
}

/** Grava localmente e coloca na fila de envio, numa só transação. */
export async function gravarOffline<T extends { id: string }>(
  tabela: TabelaSincronizada,
  registo: T,
) {
  await db.transaction('rw', db.table(tabela), db.pendentes, async () => {
    await db.table(tabela).put(registo)
    await db.pendentes.add({
      tabela,
      registo: registo as unknown as Record<string, unknown>,
      criado_em: new Date().toISOString(),
      tentativas: 0,
    })
  })
}

/** Pede ao iPad que não apague os dados locais quando faltar espaço. */
export async function pedirArmazenamentoPersistente() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    /* sem suporte: ignora */
  }
}

/** Apaga os dados locais (ao terminar sessão). */
export async function limparDadosLocais() {
  await db.delete()
  await db.open()
}
