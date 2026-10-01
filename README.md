# Trama Studio · App

App para iPad (PWA) de visitas, medições, orçamentos e assinaturas da Trama Studio, com backoffice para o gestor.

Especificação funcional: [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md).

## Stack

React 19 · Vite · TypeScript · Tailwind · PWA (funciona offline) · Dexie (IndexedDB) · Supabase (Postgres, Auth, Storage) · Cloudflare Pages.

## Estrutura

```
supabase/migrations/   Esquema da base de dados, permissões (RLS) e storage
src/lib/calculo/       Motor de cálculo de tecido e preço (com testes)
src/lib/db.ts          Base local no iPad (offline)
src/lib/sync.ts        Sincronização com o Supabase
src/paginas/app/       App de campo (gestor e técnicos)
src/paginas/admin/     Backoffice (só gestor)
```

## Configuração inicial (uma vez)

### 1. Supabase

1. **SQL Editor** → colar e executar, por esta ordem:
   - `supabase/migrations/20261001000000_esquema_inicial.sql`
   - `supabase/migrations/20261001000100_storage.sql`
   - `supabase/migrations/20261002000000_visita_obra_e_janelas.sql` (fase 2: dados da obra e escolhas por janela)
2. **Authentication → Sign In / Providers → Email**: desligar *Allow new users to sign up*. Só entra quem for convidado.
3. **Authentication → Users → Add user → Create new user** com o teu email, uma palavra-passe e *Auto Confirm User* ligado. **O primeiro utilizador criado fica gestor**; os seguintes ficam técnicos.
4. **Authentication → URL Configuration**:
   - *Site URL*: o endereço do Cloudflare Pages (ex.: `https://trama-app.pages.dev`) ou, mais tarde, `https://app.tramastudio.pt`
   - *Redirect URLs*: o mesmo endereço com `/**` e `http://localhost:5173/**`
5. **Project Settings → API**: copiar a chave **anon / publishable**. É pública por natureza; a segurança está nas regras RLS. A chave `service_role` nunca vai para a app.

### 2. Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git** → repositório `mangelott/tramastudio`.
2. Framework preset: **Vite** · Build command: `npm run build` · Output: `dist`.
3. Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Cada push para `main` publica automaticamente.

### 3. iPad

Abrir o endereço no **Safari** → Partilhar → **Adicionar ao ecrã principal**. Abrir sempre pelo ícone: assim os dados offline ficam protegidos.

## Desenvolvimento local

```bash
cp .env.example .env.local   # preencher a chave anon
npm install
npm run dev                  # http://localhost:5173
npm test                     # testes do motor de cálculo
```

## Perfis

- **Gestor**: tudo, incluindo custos, margens, catálogo, parâmetros e utilizadores (`/admin`).
- **Técnico**: só os seus clientes e visitas e o catálogo com preços de venda. Não vê custos, fornecedores nem margens. As regras estão na base de dados, não apenas no ecrã.

Convidar técnicos: Supabase → Authentication → Users → **Invite user**. Atribuir o perfil em Backoffice → Utilizadores.
