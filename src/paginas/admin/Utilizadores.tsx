import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSessao } from '../../auth/Sessao'
import type { Perfil } from '../../lib/tipos'
import { Cabecalho, Erro, Vazio } from '../../ui/ui'

export function Utilizadores() {
  const { perfil: eu } = useSessao()
  const [lista, setLista] = useState<Perfil[] | null>(null)
  const [erro, setErro] = useState('')

  async function carregar() {
    const { data, error } = await supabase.from('perfis').select('id, nome, email, papel, ativo').order('nome')
    if (error) setErro(error.message)
    else setLista(data as Perfil[])
  }
  useEffect(() => {
    void carregar()
  }, [])

  async function alterar(p: Perfil, mudanca: Partial<Perfil>) {
    setErro('')
    if (p.id === eu?.id && (mudanca.papel === 'tecnico' || mudanca.ativo === false)) {
      return setErro('Não pode retirar o seu próprio acesso de gestor.')
    }
    const { error } = await supabase.from('perfis').update(mudanca).eq('id', p.id)
    if (error) setErro(error.message)
    await carregar()
  }

  return (
    <>
      <Cabecalho sobrancelha="Gestão" titulo="Utilizadores" />
      <div className="cartao mb-6 max-w-3xl text-[14px] text-cinza">
        <div className="sobrancelha mb-2">Convidar um novo utilizador</div>
        No Supabase: <b>Authentication → Users → Invite user</b>, com o email da pessoa. Ela recebe um link para
        definir a palavra-passe e aparece aqui como <b>técnico</b>. Nesta fase o convite faz-se no Supabase; mais
        tarde passa a ser feito aqui.
      </div>
      <Erro>{erro}</Erro>
      {!lista ? (
        <Vazio>A carregar…</Vazio>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-linho bg-white">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-linho text-[11px] uppercase tracking-[.1em] text-cinza">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linho">
              {lista.map((p) => (
                <tr key={p.id} className={p.ativo ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-semibold">{p.nome}{p.id === eu?.id && ' (eu)'}</td>
                  <td className="px-4 py-3">{p.email}</td>
                  <td className="px-4 py-3">
                    <select className="campo min-h-10 w-40" value={p.papel} onChange={(e) => alterar(p, { papel: e.target.value as Perfil['papel'] })}>
                      <option value="tecnico">Técnico</option>
                      <option value="gestor">Gestor</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button className={p.ativo ? 'btn-perigo min-h-10' : 'btn-sec min-h-10'} onClick={() => alterar(p, { ativo: !p.ativo })}>
                      {p.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
