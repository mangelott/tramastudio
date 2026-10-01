import Dexie, { type EntityTable } from 'dexie'
import type { Artigo, Cliente, Confecao, Foto, JanelaVisita, Parametro, Tecido, Visita } from './tipos'

/** Alteração feita no iPad, à espera de ser enviada ao servidor. */
export interface Pendente {
  seq?: number
  tabela: TabelaSincronizada
  registo: Record<string, unknown>
  criado_em: string
  tentativas: number
  erro?: string
}

export type TabelaSincronizada = 'clientes' | 'visitas' | 'janelas' | 'fotos'

export interface Meta {
  chave: string
  valor: unknown
}

/** Ficheiro de uma fotografia guardado no iPad até ser enviado (e depois como cache). */
export interface FicheiroFoto {
  id: string
  blob: Blob
  enviado: 0 | 1
}

class BaseLocal extends Dexie {
  clientes!: EntityTable<Cliente, 'id'>
  visitas!: EntityTable<Visita, 'id'>
  janelas!: EntityTable<JanelaVisita, 'id'>
  fotos!: EntityTable<Foto, 'id'>
  ficheiros!: EntityTable<FicheiroFoto, 'id'>
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
    this.version(2).stores({
      visitas: 'id, cliente_id, agendada_para, estado, updated_at',
      janelas: 'id, visita_id, [visita_id+divisao], updated_at',
      fotos: 'id, visita_id, janela_id, updated_at',
      ficheiros: 'id, enviado',
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
    await porNaFila(tabela, registo as unknown as Record<string, unknown>)
  })
}

/**
 * Coloca um registo na fila de envio. Se o mesmo registo já lá estiver à espera
 * (sem erro), substitui-o, para que muitas edições seguidas resultem num só envio.
 */
async function porNaFila(tabela: TabelaSincronizada, registo: Record<string, unknown>) {
  const existente = await db.pendentes
    .where('tabela')
    .equals(tabela)
    .filter((p) => p.registo.id === registo.id && !p.erro)
    .last()
  if (existente) {
    await db.pendentes.update(existente.seq!, { registo })
  } else {
    await db.pendentes.add({ tabela, registo, criado_em: new Date().toISOString(), tentativas: 0 })
  }
}

/** Guarda uma fotografia (registo + ficheiro) e coloca-a na fila de envio. */
export async function gravarFotoOffline(foto: Foto, blob: Blob) {
  await db.transaction('rw', [db.fotos, db.ficheiros, db.pendentes], async () => {
    await db.ficheiros.put({ id: foto.id, blob, enviado: 0 })
    await db.fotos.put(foto)
    await porNaFila('fotos', foto as unknown as Record<string, unknown>)
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
