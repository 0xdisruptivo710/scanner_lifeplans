# `guide_pdr.md` — Clone & Provision Guide

> **Para o agente (Claude Code / Codex / outro):** este documento é a fonte de verdade quando alguém clonar este repositório para um **novo cliente**. Siga os passos na ordem. O código-fonte do app é idêntico entre clientes; o que muda são **identificadores, tokens e dados particulares** listados na **§1 Client Variables**. Quando terminar, gere o relatório final descrito em **§9 Smoke Test & Handover**.

---

## 0. O que este projeto é

`aios-inteligence` é um painel embutido dentro do [Aios CRM](https://app.aioscrm.com) que mostra **sugestões de follow-up geradas por IA** (mensagem WhatsApp + tag + movimento de card no kanban) para um operador humano revisar, editar e aprovar.

Arquitetura, alto nível:

```
┌───────────────────────────────────┐         ┌──────────────────────────┐
│  n8n / classifier IA (externo)    │ ──────► │  Supabase (Postgres)     │
│  popula wts_auto_followup_log     │         │  wts_auto_followup_log    │
└───────────────────────────────────┘         │  wts_panel_mapping        │
                                              │  wts_auto_followup_runs   │
                                              └─────────────┬────────────┘
                                                            │ supabase-js + Realtime
                                                            ▼
                                              ┌──────────────────────────┐
                                              │  Vercel (Vite SPA)       │
                                              │  + /api/wts proxy        │ ──► api.wts.chat
                                              │    (server-only token)   │
                                              └──────────────────────────┘
```

- **Front-end:** React + Vite + TanStack Router + TanStack Query + Tailwind + shadcn/ui.
- **Banco:** Supabase (Postgres). Cliente lê com a `anon key`. RLS está **desligada** em `wts_auto_followup_log` e `wts_panel_mapping` (decisão consciente — o app é embutido no Aios, URL não é compartilhada).
- **Proxy WTS:** `api/wts.ts` (Vercel Function) — segura o token da WTS no servidor e mascara CORS. **Nunca** colocar o token da WTS no client.

---

## 1. Client Variables — tabela única do que muda

Tudo nesta tabela é **por cliente**. Tudo que **não** está aqui deve ficar idêntico ao repositório original.

| # | Variável | Onde vive | Exemplo (Itupeva) | Notas |
|---|---|---|---|---|
| 1 | `CLIENT_HANDLE` | `src/lib/constants.ts:10` | `'itupeva'` | Slug em minúsculas, sem espaços. Mesmo valor usado em `wts_auto_followup_log.client_handle` e `wts_panel_mapping.client_handle`. Convém manter idêntico ao nome do projeto Vercel. |
| 2 | `WHATSAPP_FROM` (dígitos) | `src/lib/constants.ts:9` | `'5511913352918'` | DDI + DDD + número, sem formatação. |
| 3 | `WHATSAPP_FROM_FORMATTED` | `src/lib/wts.ts:8` | `'(11) 91335-2918'` | Formato exato que a WTS aceita em `POST /chat/v1/message/send`. **Tem que bater**, não inventar. |
| 4 | `DEFAULT_PANEL_ID` | `src/lib/constants.ts:12` | `'82b8ab1a-6945-4e63-a098-a7cf85a831cd'` | UUID do painel "Gestor CRM" do cliente na WTS. |
| 5 | `ALLOWED_PANEL` (nome) | `src/components/drawer/column-select.tsx:11` | `'Painel Comercial - Gestor CRM'` | Título **exato** do painel — bate com `panel_name` em `wts_panel_mapping`. Se o painel do cliente tem outro nome, mudar aqui. |
| 6 | Marca exibida no preview | `src/components/drawer/whatsapp-preview.tsx` | `Forma de Ser · Itupeva` | Texto livre, só estético. |
| 7 | Catálogo de tags | `src/data/tags-<handle>.json` + import em `src/components/drawer/tag-select.tsx:9` | `tags-itupeva.json` | Renomear o arquivo e atualizar o import. Conteúdo: estrutura `{ categories: { [key]: { label, tags: [...] } } }`. |
| 8 | `VITE_SUPABASE_URL` | `.env` + Vercel envs | `https://ehlpmukjdknnyhkycncb.supabase.co` | URL do **novo** projeto Supabase do cliente. |
| 9 | `VITE_SUPABASE_ANON_KEY` | `.env` + Vercel envs | `eyJhbG…` | `anon` key do novo projeto Supabase. Não confundir com `service_role`. |
| 10 | `WTS_TOKEN_<HANDLE>` | Vercel env (server-only) + `api/wts.ts` | `WTS_TOKEN_ITUPEVA` | Renomear a env e atualizar a leitura em `api/wts.ts:2`. **Server-only**, sem prefixo `VITE_`. |
| 11 | `VITE_WTS_TOKEN_<HANDLE>` (tipo) | `src/vite-env.d.ts:6` | `VITE_WTS_TOKEN_ITUPEVA` | Manter o tipo em sincronia. Em produção o token nunca é usado no client — o tipo existe só por legado / dev local com `vercel dev`. |
| 12 | Nome do repo GitHub | GitHub | `aios-inteligence-itupeva` | Sugestão: `aios-inteligence-<handle>`. |
| 13 | Nome do projeto Vercel | Vercel | `aios-inteligence-itupeva` | Match com o repo. |
| 14 | (Opcional) Infosoft ERP | `.env`: `VITE_INFOSOFT_API_BASE`, `VITE_INFOSOFT_API_TOKEN` | — | Hoje não consumido pelo app, deixar em branco se o cliente não usa. |

> **Regra de ouro:** se um valor não está nesta tabela, **não toque**. Cores, tipografia, layout, copy, migrations, schema, lógica de aprovação — tudo idêntico.

---

## 2. Pré-requisitos

Antes de começar, ter em mãos:

- [ ] Acesso à organização GitHub onde o repo do cliente vai morar
- [ ] Acesso à organização Vercel
- [ ] Conta Supabase com permissão para criar projeto novo (recomendado: região `sa-east-1` São Paulo)
- [ ] Token da WTS do cliente (gerado dentro do Aios CRM, sem prefixo `Bearer`)
- [ ] Número WhatsApp Business do cliente (dígitos + formato com parênteses)
- [ ] Acesso à API da WTS pra extrair os painéis e steps do cliente
- [ ] Node.js ≥ 20, `git`, `npm`. Recomendado: `vercel` CLI (`npm i -g vercel`) e `supabase` CLI

---

## 3. Clonagem do repositório

```bash
# 1) clonar como template (sem o histórico do cliente anterior)
git clone https://github.com/0xdisruptivo710/ai-outreach-assistant.git aios-inteligence-<handle>
cd aios-inteligence-<handle>

# 2) descartar o histórico do cliente original e abrir um novo
rm -rf .git
git init
git add .
git commit -m "chore: bootstrap aios-inteligence for <handle>"

# 3) criar repo novo no GitHub e empurrar
gh repo create <org>/aios-inteligence-<handle> --private --source=. --remote=origin --push
```

Se preferir manter histórico do template, use `git clone … && git remote remove origin && gh repo create … --push`.

```bash
# 4) instalar dependências
npm install

# 5) typecheck inicial (deve passar limpo, sem mudanças)
npm run typecheck
```

---

## 4. Banco de dados — Supabase

> **Princípio:** as 6 migrations em `migrations/` são **canônicas e idempotentes** (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS`). Aplicar **todas** na ordem em todo cliente novo. Não editar, não pular, não criar variantes.

### 4.1 Criar o projeto

1. Supabase Dashboard → New Project → região `sa-east-1` (São Paulo) → password forte e guardar no 1Password.
2. Anotar:
   - **Project URL** → vira `VITE_SUPABASE_URL` (variável #8)
   - **anon public key** → vira `VITE_SUPABASE_ANON_KEY` (#9)
   - **service_role key** → para uso interno (Edge Functions / migrations), **nunca** ir pro client.

### 4.2 Aplicar as migrations

Em **ordem alfabética** (o sufixo de data já garante isso):

```
2026-05-11_create_followup_log_tables.sql
2026-05-11b_followup_action_tracking.sql
2026-05-11c_aios_inteligence_schema.sql
2026-05-11d_rls_policies_authenticated.sql
2026-05-11e_disable_rls_lovable_simples.sql
2026-05-12a_add_customer_name.sql
```

Resumo do que cada uma faz:

| Migration | Cria / altera | Notas |
|---|---|---|
| `…create_followup_log_tables` | `wts_auto_followup_log`, `wts_auto_followup_runs` + índices | Tabela-chave do app. RLS habilitada inicialmente. |
| `…b_followup_action_tracking` | Colunas de tracking de ação humana + tabela `wts_panel_mapping` | `action_status`, `actioned_by`, `wts_errors`, etc. |
| `…c_aios_inteligence_schema` | Coluna `suggest_message`, `card_action`, `card_id_used` | Pivot pra "CRM organizer" — IA sugere tag + coluna mesmo sem mensagem. |
| `…d_rls_policies_authenticated` | Policies para `authenticated` + `ADD TABLE wts_auto_followup_log` ao publication realtime | |
| `…e_disable_rls_lovable_simples` | `DISABLE ROW LEVEL SECURITY` em `wts_auto_followup_log` e `wts_panel_mapping` | **Decisão consciente**: app embutido, URL não compartilhada. Se for compartilhar URL externa, reverter e fazer auth de verdade. |
| `…a_add_customer_name` | Coluna `customer_name` em `wts_auto_followup_log` | |

**Como aplicar — escolher um dos três:**

**Opção A (recomendada): Supabase CLI**

```bash
supabase link --project-ref <project-ref>      # ref da URL: https://<ref>.supabase.co
for f in migrations/2026-*.sql; do
  echo "--- applying $f ---"
  supabase db execute --file "$f"
done
```

**Opção B: MCP Supabase (se o agente tiver o servidor MCP `Supabase` plugado)**

Para cada arquivo em `migrations/` (em ordem), chamar `mcp__claude_ai_Supabase__apply_migration` com o conteúdo do arquivo como `query` e o nome do arquivo (sem extensão) como `name`. Validar com `mcp__claude_ai_Supabase__list_migrations` ao final.

**Opção C: Dashboard manual**

Supabase Dashboard → SQL Editor → colar arquivo por arquivo, na ordem, executar cada um. Conferir em Database → Tables que `wts_auto_followup_log`, `wts_auto_followup_runs`, `wts_panel_mapping` existem.

### 4.3 Realtime

A migration `…d` já roda `ALTER PUBLICATION supabase_realtime ADD TABLE wts_auto_followup_log;`. Confirmar em **Database → Replication** que a tabela está marcada. Sem isso, o app abre mas sugestões novas só aparecem após `Atualizar`.

### 4.4 Seed do `wts_panel_mapping`

Esta tabela é o **espelho local dos painéis/steps da WTS do cliente**. Sem ela, `ColumnSelect` vem vazio e aprovação não consegue resolver `step_id`.

```sql
-- Padrão de um INSERT:
INSERT INTO wts_panel_mapping (client_handle, panel_id, panel_name, step_id, step_name)
VALUES
  ('<handle>', '<panel-uuid>', 'Painel Comercial - Gestor CRM', '<step-uuid>', 'Agendou'),
  ('<handle>', '<panel-uuid>', 'Painel Comercial - Gestor CRM', '<step-uuid>', 'Em negociação'),
  -- … todos os steps do painel "Gestor CRM" do cliente …
ON CONFLICT (client_handle, panel_id, step_id) DO NOTHING;
```

Para extrair os UUIDs do cliente, fazer dois GETs autenticados na WTS (ver `wts-api-reference.md` §2.4):

1. `GET /crm/v1/panel?PageSize=50` → encontrar o painel cujo `title === 'Painel Comercial - Gestor CRM'` (ou o equivalente do cliente — variável #5) e copiar o `id`. Esse `id` vira `DEFAULT_PANEL_ID` (variável #4).
2. `GET /crm/v1/panel/<panel_id>?IncludeDetails=Steps` → para cada `step` em `steps[]`, gerar uma linha de INSERT.

O front-end filtra o dropdown para mostrar **apenas** os steps do painel cujo nome bate com `ALLOWED_PANEL` (variável #5). Steps de outros painéis (ex.: "Consultora Comercial - PipeLine") podem ficar na tabela — eles são ignorados na UI mas continuam disponíveis caso o N8N classifier os sugira.

---

## 5. WTS — token e configuração

1. Pegar o token da WTS do cliente (Aios → Configurações → API Token, ou pedir pro stakeholder). **Não tem prefixo `Bearer`.**
2. Vai entrar como env **server-only** no Vercel (variável #10).
3. Atualizar o nome da env em `api/wts.ts`:

```ts
// api/wts.ts:2  — trocar o sufixo pelo CLIENT_HANDLE em CAIXA ALTA
const token = process.env.WTS_TOKEN_<HANDLE_UPPER> || process.env.VITE_WTS_TOKEN_<HANDLE_UPPER>;
```

4. Atualizar o tipo:

```ts
// src/vite-env.d.ts:6
readonly VITE_WTS_TOKEN_<HANDLE_UPPER>: string;
```

> Em produção o token nunca chega no client — a função em `api/wts.ts` lê `process.env`, faz proxy pro `https://api.wts.chat`, e devolve a resposta. Manter assim. **Não** colocar o token em `VITE_*` no Vercel.

### 5.1 Rate-limit & retry

WTS limita ~1.5 req/s. Já tratado em `src/lib/constants.ts:14` (`WTS_RATE_LIMIT_MS = 700`) e `BULK_CONCURRENCY = 5`. **Não mudar sem motivo.**

---

## 6. Aplicar as Client Variables no código

> Faça **só** as 7 mudanças abaixo. Qualquer outro arquivo deve ficar idêntico ao template — se você precisar mexer em mais coisa, pare e revise.

1. **`src/lib/constants.ts`** — trocar `CLIENT_HANDLE`, `WHATSAPP_FROM`, `DEFAULT_PANEL_ID`. (`SUPABASE_URL` default pode continuar apontando pro template — a env do Vercel sobrescreve em produção.)
2. **`src/lib/wts.ts`** — `WHATSAPP_FROM_FORMATTED` (linha 8).
3. **`src/components/drawer/column-select.tsx`** — `ALLOWED_PANEL` (linha 11) se o painel do cliente tem nome diferente.
4. **`src/components/drawer/whatsapp-preview.tsx`** — texto da clínica/marca (linha ~25).
5. **`src/components/drawer/tag-select.tsx`** — `import tagsCurado from '@/data/tags-<handle>.json';`.
6. **`src/data/tags-<handle>.json`** — criar a partir do template (`tags-itupeva.json`), trocar `client_handle`, revisar categorias e tags com o cliente.
7. **`api/wts.ts`** + **`src/vite-env.d.ts`** — renomear sufixo do nome da env (§5).

Verificar:

```bash
npm run typecheck            # tem que passar limpo
npm run build                # idem
```

---

## 7. Vercel — deploy

### 7.1 Criar projeto

```bash
vercel login
vercel link                  # ou vercel projects add aios-inteligence-<handle>
```

Framework preset: **Vite** (já no `vercel.json`). Output: `dist`. Build: `npm run build`.

### 7.2 Environment Variables

Adicionar em **Production**, **Preview** e **Development**:

| Nome | Escopo | Valor |
|---|---|---|
| `VITE_SUPABASE_URL` | Client | URL do Supabase do cliente |
| `VITE_SUPABASE_ANON_KEY` | Client | anon key do Supabase do cliente |
| `WTS_TOKEN_<HANDLE_UPPER>` | **Server-only** | Token da WTS — **sem `VITE_`** |
| `VITE_INFOSOFT_API_BASE` | Client | (opcional) deixar em branco se não usar |
| `VITE_INFOSOFT_API_TOKEN` | Client | (opcional) idem |

Pelo CLI:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add WTS_TOKEN_<HANDLE_UPPER> production
# … repetir para preview e development se necessário
```

> Nunca prefixar o token da WTS com `VITE_` em produção — isso jogaria o token pro bundle do cliente.

### 7.3 Deploy

```bash
git push origin main         # auto-deploy via integração GitHub
# ou:
vercel deploy --prod
```

---

## 8. Embed no Aios CRM

O painel final vive como `iframe` dentro do Aios. Sequência:

1. Aios CRM → Configurações → Integrações → "Apps Externos" → adicionar a URL do deploy Vercel.
2. Confirmar que o domínio do Vercel é permitido nos cabeçalhos `X-Frame-Options` / `Content-Security-Policy` do Aios (se for o caso).
3. Operador abre o painel embutido — sem login extra; o app é stateless do lado da auth (usa `anon key` e a RLS desligada decidida em §4.2).

---

## 9. Smoke Test & Handover

Antes de entregar pro cliente, validar os 7 pontos abaixo. O agente deve produzir esse relatório como mensagem final.

| # | Verificação | Como |
|---|---|---|
| 1 | App carrega sem erros | Abrir a URL do Vercel, console limpo |
| 2 | Header mostra "Caixa de Sugestões" e "Ações Aprovadas", botão **Atualizar** funciona | Navegar entre as duas rotas |
| 3 | Inbox lista sugestões pending do `client_handle` correto | Confirmar contagem bate com `SELECT count(*) FROM wts_auto_followup_log WHERE client_handle='<handle>' AND action_status='pending'` |
| 4 | Drawer abre, mostra dados do cliente, dropdown **Coluna** lista apenas steps do painel "Gestor CRM" | Clicar em uma linha |
| 5 | Realtime: inserir uma row de teste com `action_status='pending'` via SQL Editor → aparece sem clicar Atualizar | |
| 6 | Aprovar uma sugestão de teste move para a aba "Ações Aprovadas" e dispara as chamadas WTS sem 401/403 | Conferir `wts_errors` em null/empty na linha |
| 7 | `/api/wts?p=/core/v1/tag&PageSize=1` retorna 200 com JSON | `curl https://<deploy>.vercel.app/api/wts?p=/core/v1/tag&PageSize=1` |

Relatório final do agente — formato sugerido:

```
## Provisionamento aios-inteligence-<handle> — concluído

**GitHub:** <url>
**Vercel:** <url>
**Supabase:** <project-ref>
**Client handle:** <handle>

### Variáveis aplicadas
- CLIENT_HANDLE = <handle>
- WHATSAPP_FROM = <dígitos>
- WHATSAPP_FROM_FORMATTED = <formatado>
- DEFAULT_PANEL_ID = <uuid>
- ALLOWED_PANEL = <nome>
- Catálogo de tags: src/data/tags-<handle>.json (N categorias, M tags)
- Env name WTS = WTS_TOKEN_<HANDLE_UPPER>

### Migrations aplicadas
- [x] …create_followup_log_tables
- [x] …b_followup_action_tracking
- [x] …c_aios_inteligence_schema
- [x] …d_rls_policies_authenticated
- [x] …e_disable_rls_lovable_simples
- [x] …a_add_customer_name

### Seed
- wts_panel_mapping: N rows inseridas pro painel "<nome>"

### Smoke test
1–7: [x]

### Pendências
<lista, ou "nenhuma">
```

---

## 10. O que NÃO mudar

Hard-stop. Se você (humano ou agente) estiver tentado a mexer em qualquer um destes, pare e pergunte:

- Schema do banco — qualquer coluna nova vira **uma nova migration** versionada, não edição das existentes.
- `WTS_RATE_LIMIT_MS`, `BULK_CONCURRENCY` em `src/lib/constants.ts`.
- Lógica de `approveOne` em `src/hooks/use-approve.ts` (ordem: tag → card → mensagem, com rate-limit entre etapas).
- Payload de `wtsCreateCard` em `src/lib/wts.ts` (`{ stepId, title, contactIds: [...], sessionId? }`) — alinhado ao curl oficial em commit `f2a9625`.
- Decisão de RLS desligada (migration `…e`).
- Design tokens em `src/styles.css` e `tailwind.config.ts`.

---

## 11. Troubleshooting rápido

| Sintoma | Causa provável | Fix |
|---|---|---|
| Inbox vazia, mas há rows na DB | `client_handle` errado em `constants.ts` ou nas rows | Conferir `SELECT DISTINCT client_handle FROM wts_auto_followup_log` |
| Dropdown Coluna vazio | Falta seed em `wts_panel_mapping` para esse `client_handle` | Refazer §4.4 |
| Aprovar dá `401 ERROR_UNAUTHORIZED` | Token WTS errado ou prefixado com `Bearer` | Re-emitir token no Aios, atualizar env no Vercel, redeploy |
| Aprovar dá `step_id_not_found_for:<nome>` | `panel_mapping` não tem essa composite_key | Conferir se `panel_name` no INSERT bate **exatamente** com o título na WTS |
| Sugestões não chegam em tempo real | Tabela não está no publication `supabase_realtime` | `ALTER PUBLICATION supabase_realtime ADD TABLE wts_auto_followup_log;` |
| `/api/wts` retorna 500 `WTS_TOKEN_… not configured` | Env name no Vercel não bate com `api/wts.ts` | Conferir nome (§6 item 7), redeploy |
| `npx tsc` reclama de `VITE_WTS_TOKEN_…` | `src/vite-env.d.ts` ainda tem o sufixo antigo | Renomear (§6 item 7) |
| Sugestões duplicadas após `Atualizar` | React Query cache stale + realtime concorrente | Limpar `qc.removeQueries({ queryKey: ['suggestions'] })` no devtools, normalmente é só percepção |

---

## 12. Referências

- `wts-api-reference.md` — endpoints, payloads, IDs do template (Itupeva) e troubleshooting da WTS.
- `aios_crm_design_system.html` — tokens visuais (cores, raios, tipografia) do Aios CRM. Não tocar; já está aplicado.
- `prompt.md` — prompt do classifier IA. Vive no n8n, fora deste repo, mas referência aqui.
- `CLAUDE (3).md` — notas livres do dono do repo (Murilo). Não é runbook.

---

**Última revisão:** 2026-05-14
