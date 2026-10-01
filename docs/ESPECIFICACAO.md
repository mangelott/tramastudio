# Trama Studio · App de visitas e orçamentos

Especificação funcional · v0.1 · outubro 2026

## 1. Objetivo

Substituir o papel no trabalho de campo da Trama Studio. Na visita, com um iPad e um medidor laser, o técnico regista o cliente, mede as janelas, tira fotografias, calcula o tecido e o preço, gera o orçamento com a identidade da marca, recolhe a assinatura do cliente no ecrã e o PDF assinado segue por email.

A faturação certificada pela AT fica fora desta app. Mais tarde liga-se ao InvoiceXpress ou ao Moloni por API.

## 2. Perfis e permissões

Há dois perfis. Cada utilizador tem um só perfil, atribuído pelo gestor.

| Pode… | Gestor | Técnico |
|---|:-:|:-:|
| Entrar na app de campo (visitas, medições, orçamentos, assinaturas) | ✔ | ✔ |
| Ver clientes | todos | só os que criou ou com visitas atribuídas a si |
| Ver visitas | todas | só as atribuídas a si |
| Ver catálogo (tecidos, confeções, calhas) com **preço de venda** | ✔ | ✔ |
| Ver **preço de custo, fornecedores, margens** | ✔ | ✘ |
| Alterar catálogo, preços, parâmetros de cálculo | ✔ | ✘ |
| Ver métricas (faturação prevista, margens, taxa de aceitação) | ✔ | ✘ |
| Gerir utilizadores e perfis | ✔ | ✘ |
| Apagar clientes, visitas, documentos | ✔ | ✘ |
| Alterar um orçamento já assinado | ✘ | ✘ |

As regras são aplicadas **na base de dados** (Row Level Security do Postgres), não apenas escondidas no ecrã. Um técnico não consegue ler custos nem margens, mesmo que use a API diretamente.

Os custos estão em tabelas separadas (`*_custos`), legíveis só pelo gestor. Quando um orçamento é guardado, a base de dados copia o custo de cada linha para `orcamento_linhas_custos`. Assim, a margem real de cada orçamento fica registada, mesmo que os custos mudem depois.

## 3. Áreas da aplicação

### 3.1 App de campo (`/app`), gestor e técnico
Pensada para iPad na horizontal, com botões grandes.

1. **Hoje**: visitas do dia e pendentes de sincronização.
2. **Clientes**: lista, pesquisa e ficha (dados, visitas, documentos, consentimentos).
3. **Visita**:
   - dados da obra (morada, acessos, observações);
   - **janelas**, divisão a divisão: largura e altura (cm), tipo de fixação (teto ou parede), abertura (central ou lateral) e fotografias;
   - para cada janela: confeção, tecido, forro opcional e calha. O cálculo de metros e preço é imediato.
4. **Orçamento**: resumo por divisão, desconto, IVA e total. Gera o PDF com a marca.
5. **Assinatura**: o cliente revê o PDF e assina no ecrã (dedo ou Apple Pencil). Escolhe os consentimentos opcionais. O PDF assinado é enviado por email.

### 3.2 Backoffice (`/admin`), só gestor
1. **Painel**: orçamentos enviados, aceites e recusados; valor total; margem média; por técnico e por mês.
2. **Catálogo**: tecidos, forros, confeções, calhas e acessórios, serviços (instalação, deslocação). Preço de venda e preço de custo, fornecedor.
3. **Fornecedores**.
4. **Parâmetros de cálculo**: fatores de franzido, folgas, bainhas, arredondamentos, IVA, validade do orçamento, margem mínima de alerta.
5. **Utilizadores**: convidar, atribuir perfil, desativar.
6. **Documentos**: todos os PDFs assinados, com o registo de prova de cada assinatura.

## 4. Funcionamento offline

- A app guarda no iPad (IndexedDB) os clientes, as visitas e o catálogo de que o técnico precisa.
- Tudo o que é criado sem rede fica numa fila e é enviado quando houver ligação, com a app aberta. O Safari não sincroniza em segundo plano.
- Os identificadores são gerados no iPad (UUID), por isso não há conflitos de numeração. O número de orçamento definitivo (ex.: `ORC 2026/0042`) é atribuído pela base de dados na primeira sincronização.
- Em caso de conflito, prevalece a alteração mais recente.
- O PDF é gerado no iPad. A assinatura funciona sem rede e o email sai quando houver ligação.

## 5. Assinatura e prova

Assinatura eletrónica simples, sem código por email ou SMS. Cada assinatura guarda:

- nome de quem assinou e imagem da assinatura;
- data e hora;
- *hash* SHA-256 do PDF final;
- técnico presente, dispositivo (user agent) e, se autorizado, localização;
- data e destinatário do envio por email.

Registos de assinatura não podem ser alterados nem apagados, nem pelo gestor.

## 6. Proteção de dados (RGPD)

| Documento | Obrigatório? | Base legal |
|---|---|---|
| Informação sobre o tratamento de dados | Mostrar sempre. A assinatura é configurável (por omissão, não é exigida) | Execução de contrato e dever de informar (art. 6.º 1 b e art. 13.º) |
| Consentimento para uso de fotografias do projeto | Opcional, por omissão desligado | Consentimento (art. 6.º 1 a) |
| Consentimento para comunicações de marketing | Opcional, por omissão desligado | Consentimento |

Fica sempre registado que a informação foi prestada. Só se regista «assinado» quando o cliente assina de facto. Os consentimentos podem ser revogados na ficha do cliente.

Dados alojados na UE (Supabase, Frankfurt).

## 7. Regras de cálculo (valores iniciais, editáveis no backoffice)

**Largura da calha** = largura da janela + 2 × sobreposição lateral (15 cm).

**Largura de tecido necessária** = largura da calha × fator de franzido da confeção + n.º de panos × 2 × bainha lateral (5 cm).

**Altura de corte** = altura acabada + bainha inferior (10 cm) + cabeçal (5 cm).

| Confeção | Fator de franzido |
|---|---|
| Onda (wave) | 2,0 |
| Prega simples | 2,0 |
| Prega dupla / francesa | 2,5 |
| Ilhós | 1,8 |
| Franzido com fita | 2,2 |
| Liso / painel | 1,2 |

**Tecido ao alto (largura normal do rolo):**
- larguras = arredondar para cima (largura necessária ÷ largura útil do rolo);
- com *raccord*, a altura de corte é arredondada para o múltiplo seguinte do *raccord*;
- metros = larguras × altura de corte.

**Tecido de altura (rolo de 280–320 cm usado na horizontal, sem costuras):**
- só se a altura de corte couber na largura do rolo;
- metros = largura necessária.

Os metros são arredondados para cima a 0,10 m.

**Preço por janela** = metros de tecido × preço/m + metros de forro × preço/m + largura da calha (m) × preço da confeção/m + largura da calha (m) × preço da calha/m + instalação por janela.

O total soma as janelas, aplica o desconto e o IVA (23 %). O backoffice avisa quando a margem de um orçamento fica abaixo do mínimo definido.

## 8. Arquitetura

| Camada | Tecnologia |
|---|---|
| App | PWA · React 19 · Vite · TypeScript · Tailwind CSS |
| Dados no iPad | Dexie (IndexedDB) + fila de sincronização |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions), região Frankfurt |
| PDF | pdf-lib, gerado no iPad |
| Assinatura | signature_pad |
| Email | Resend, chamado por uma Edge Function |
| Alojamento | Cloudflare Pages, deploy automático a partir do GitHub |

## 9. Fases

1. **Base**: login, perfis, esquema e permissões, clientes, catálogo no backoffice, motor de cálculo. ← *esta entrega*
2. **Visita**: janelas, fotografias, cálculo por janela, offline completo.
3. **Orçamento e assinatura**: PDF com a marca, assinatura, registo de prova, RGPD e consentimentos, envio por email.
4. **Gestão**: painel de métricas, documentos, gestão de utilizadores na app.
5. **Depois**: faturação (InvoiceXpress/Moloni), encomendas a fornecedores, agenda, estores.
