import { EditorCatalogo, type ConfigCatalogo } from './EditorCatalogo'

const tecidos: ConfigCatalogo = {
  titulo: 'Tecidos e forros',
  sobrancelha: 'Catálogo',
  tabela: 'tecidos',
  ordem: 'nome',
  tabelaCustos: 'tecidos_custos',
  fkCustos: 'tecido_id',
  margem: ['preco_venda_m', 'preco_custo_m'],
  novo: { tipo: 'tecido', orientacao: 'de_altura', largura_cm: 300, raccord_cm: 0, preco_venda_m: 0, ativo: true },
  campos: [
    { chave: 'referencia', rotulo: 'Referência', tipo: 'texto', obrigatorio: true, naLista: true },
    { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naLista: true },
    { chave: 'tipo', rotulo: 'Tipo', tipo: 'opcao', naLista: true, opcoes: [['tecido', 'Tecido'], ['forro', 'Forro'], ['blackout', 'Blackout']] },
    { chave: 'colecao', rotulo: 'Coleção', tipo: 'texto' },
    { chave: 'composicao', rotulo: 'Composição', tipo: 'texto' },
    { chave: 'opacidade', rotulo: 'Opacidade', tipo: 'texto' },
    { chave: 'largura_cm', rotulo: 'Largura do rolo (cm)', tipo: 'numero', obrigatorio: true, naLista: true, formato: 'decimal' },
    {
      chave: 'orientacao', rotulo: 'Utilização', tipo: 'opcao', naLista: true,
      opcoes: [['de_altura', 'De altura (sem costuras)'], ['ao_alto', 'Ao alto (larguras)']],
    },
    { chave: 'raccord_cm', rotulo: 'Raccord (cm)', tipo: 'numero', ajuda: '0 se não tiver padrão.' },
    { chave: 'preco_venda_m', rotulo: 'Preço de venda / m', tipo: 'numero', obrigatorio: true, naLista: true, formato: 'euro' },
    { chave: 'preco_custo_m', rotulo: 'Preço de custo / m', tipo: 'numero', origem: 'custo', naLista: true, formato: 'euro' },
    { chave: 'fornecedor_id', rotulo: 'Fornecedor', tipo: 'fornecedor', origem: 'custo' },
    { chave: 'ref_fornecedor', rotulo: 'Ref. do fornecedor', tipo: 'texto', origem: 'custo' },
    { chave: 'ativo', rotulo: 'Ativo', tipo: 'bool' },
  ],
}

const confecoes: ConfigCatalogo = {
  titulo: 'Confeções',
  sobrancelha: 'Catálogo',
  tabela: 'confecoes',
  ordem: 'ordem',
  tabelaCustos: 'confecoes_custos',
  fkCustos: 'confecao_id',
  margem: ['preco_venda_m', 'preco_custo_m'],
  novo: { fator_franzido: 2, preco_venda_m: 0, ordem: 10, ativo: true },
  campos: [
    { chave: 'codigo', rotulo: 'Código', tipo: 'texto', obrigatorio: true, naLista: true },
    { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naLista: true },
    { chave: 'fator_franzido', rotulo: 'Fator de franzido', tipo: 'numero', obrigatorio: true, naLista: true, formato: 'decimal', ajuda: 'Largura de tecido ÷ largura da calha.' },
    { chave: 'preco_venda_m', rotulo: 'Preço de venda / m de calha', tipo: 'numero', obrigatorio: true, naLista: true, formato: 'euro' },
    { chave: 'preco_custo_m', rotulo: 'Custo da confeção / m', tipo: 'numero', origem: 'custo', naLista: true, formato: 'euro' },
    { chave: 'fornecedor_id', rotulo: 'Confeccionador', tipo: 'fornecedor', origem: 'custo' },
    { chave: 'ordem', rotulo: 'Ordem na lista', tipo: 'numero' },
    { chave: 'ativo', rotulo: 'Ativa', tipo: 'bool' },
  ],
}

const artigos: ConfigCatalogo = {
  titulo: 'Calhas e serviços',
  sobrancelha: 'Catálogo',
  tabela: 'artigos',
  ordem: 'nome',
  tabelaCustos: 'artigos_custos',
  fkCustos: 'artigo_id',
  margem: ['preco_venda', 'preco_custo'],
  novo: { tipo: 'calha', unidade: 'm', preco_venda: 0, ativo: true },
  campos: [
    { chave: 'codigo', rotulo: 'Código', tipo: 'texto', obrigatorio: true, naLista: true, ajuda: 'INSTALACAO é usado pela calculadora.' },
    { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naLista: true },
    {
      chave: 'tipo', rotulo: 'Tipo', tipo: 'opcao', naLista: true,
      opcoes: [['calha', 'Calha'], ['varao', 'Varão'], ['acessorio', 'Acessório'], ['servico', 'Serviço']],
    },
    { chave: 'unidade', rotulo: 'Unidade', tipo: 'opcao', naLista: true, opcoes: [['m', 'metro'], ['un', 'unidade'], ['m2', 'm²'], ['h', 'hora']] },
    { chave: 'preco_venda', rotulo: 'Preço de venda', tipo: 'numero', obrigatorio: true, naLista: true, formato: 'euro' },
    { chave: 'preco_custo', rotulo: 'Preço de custo', tipo: 'numero', origem: 'custo', naLista: true, formato: 'euro' },
    { chave: 'fornecedor_id', rotulo: 'Fornecedor', tipo: 'fornecedor', origem: 'custo' },
    { chave: 'ativo', rotulo: 'Ativo', tipo: 'bool' },
  ],
}

const fornecedores: ConfigCatalogo = {
  titulo: 'Fornecedores',
  sobrancelha: 'Catálogo',
  tabela: 'fornecedores',
  ordem: 'nome',
  novo: { ativo: true },
  campos: [
    { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naLista: true },
    { chave: 'nif', rotulo: 'NIF', tipo: 'texto', naLista: true },
    { chave: 'contacto', rotulo: 'Pessoa de contacto', tipo: 'texto', naLista: true },
    { chave: 'telefone', rotulo: 'Telefone', tipo: 'texto', naLista: true },
    { chave: 'email', rotulo: 'Email', tipo: 'texto', naLista: true },
    { chave: 'notas', rotulo: 'Notas', tipo: 'texto' },
    { chave: 'ativo', rotulo: 'Ativo', tipo: 'bool' },
  ],
}

export const Tecidos = () => <EditorCatalogo key="tecidos" config={tecidos} />
export const Confecoes = () => <EditorCatalogo key="confecoes" config={confecoes} />
export const Artigos = () => <EditorCatalogo key="artigos" config={artigos} />
export const Fornecedores = () => <EditorCatalogo key="fornecedores" config={fornecedores} />
