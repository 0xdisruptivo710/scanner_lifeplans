# AIOS Inteligence — Claude Code Orchestrator

> Contexto persistente do projeto. Lido pelo Claude Code a cada sessão.
> Mantém o desenvolvimento alinhado entre Lovable (origem do MVP) → Claude Code + Opus + Synkra AIOS (atual).

---

## 0. TL;DR

App interno **single-tenant** (`client_handle = "itupeva"`) onde **Murilo** e **Lucas** revisam, editam e aprovam sugestões de follow-up geradas pela IA AIOS para a clínica de estética Forma de Ser (Itupeva-SP).

Aprovar uma sugestão dispara **5 chamadas sequenciais à WTS Chat API direto do browser** (sem Edge Function, sem backend custom). Rejeitar é só `UPDATE` no Supabase.

- **Sem login** (app embedado no painel interno AIOS, URL não pública).
- **Tema dark obrigatório**, paleta oklch, sem alternativa light.
- **Sem emojis na UI** — só `lucide-react`.
- **Deploy:** Vercel. Edge: Hobby plan default, sem necessidade de Edge Runtime.

**Status atual:** MVP migrado do Lovable. Backend está em produção e **NÃO se mexe daqui**. Foco daqui pra frente: **polir design**, **melhorar botões e microinterações**, **robustez de erros**, **histórico/auditoria**, **suporte multi-cliente futuro**.

---

## 1. Stack

| Camada | Tech | Versão alvo |
|---|---|---|
| Framework | TanStack Start (SSR-capable) | latest |
| Linguagem | TypeScript estrito | 5.x |
| Estilo | Tailwind CSS | 3.x |
| UI | shadcn/ui | latest (copy-paste) |
| Ícones | lucide-react | latest |
| Tabela | TanStack Table v8 | 8.x |
| Data fetching | TanStack Query v5 | 5.x |
| Backend client | `@supabase/supabase-js` | 2.45+ |
| Datas | `date-fns` (+ `date-fns/locale/pt-BR`) | 3.x |
| Toasts | sonner | latest |
| Deploy | Vercel | — |

**Não usar:** Redux, Zustand, jotai (Query já cobre estado server; useState local cobre o resto). Sem ORMs no front. Sem libs de form pesadas — campos são poucos, controla na mão.

---

## 2. Arquitetura

```
┌────────────────────────────────────────────────────────────────────┐
│ Browser (Vercel-hosted SPA)                                        │
│                                                                    │
│  ┌──────────────────┐     ┌──────────────────┐                     │
│  │  React + TanStack│────▶│   Supabase JS    │──── REST/Realtime ─▶│ Supabase (lê/escreve)
│  │  Query + Table   │     └──────────────────┘                     │   wts_auto_followup_log
│  │                  │                                              │   wts_panel_mapping
│  │                  │     ┌──────────────────┐                     │
│  │                  │────▶│  fetch() direto  │──── HTTPS ──────────▶│ WTS Chat API
│  └──────────────────┘     └──────────────────┘                     │   /core /chat /crm
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

         ▲                                                  ▲
         │ realtime postgres_changes                        │
         │ (canal supabase_realtime)                        │
         └──────────── opcional, fallback polling 30s ──────┘
```

**Por que sem Edge Function?**
- Simplicidade: um único deploy, sem cold starts, sem duplicidade de lógica.
- Lovable (MVP) já provou o padrão.
- Token WTS fica em env var do Vercel (`VITE_WTS_TOKEN_ITUPEVA`) — exposto ao client, **risco assumido** (URL do app não é pública).
- A função `wts-action` (Supabase Edge) existe no monorepo de referência mas **está descontinuada** para este app.

**Hardening futuro (não bloqueante):** mover chamadas WTS para **Vercel API Routes / TanStack Start server functions** mantendo o token server-side. Quando fizer, basta substituir helpers em `lib/wts.ts` por chamadas a `/api/wts/*`. A interface dos helpers não muda.

---

## 3. Estrutura de arquivos

```
src/
  lib/
    supabase.ts            # client (auth.persistSession=false, realtime habilitado)
    constants.ts           # env, paleta, banidos, panel default
    wts.ts                 # helpers WTS (applyTag, getContact, getCards, moveCard, createCard, sendMessage)
    validation.ts          # validateMessage()
    format.ts              # anonymizePhone, formatRelativeTime, normalizePhoneBR
    types.ts               # SuggestionRow, PanelMapping, WtsError, ActionResult
  hooks/
    use-suggestions.ts     # action_status='pending'
    use-history.ts         # executed | rejected | failed
    use-realtime.ts        # canal postgres_changes + estado SUBSCRIBED/CONNECTING/CLOSED
    use-panel-mapping.ts   # Map<composite_key, {panel_id, step_id}>
    use-approve.ts         # mutation com 5 fetches sequenciais + sleep 700ms
    use-reject.ts          # UPDATE simples
    use-operator.ts        # localStorage 'aios.operator' → 'Murilo' | 'Lucas'
  components/
    layout/
      app-header.tsx
      filter-tabs.tsx
      bulk-action-bar.tsx
    table/
      suggestions-table.tsx
      columns.tsx
      type-badge.tsx        # Msg | Tag
      scenario-badge.tsx    # cor por SCENARIO_COLORS
      confidence-badge.tsx
      empty-state.tsx
    drawer/
      suggestion-drawer.tsx
      tag-select.tsx
      column-select.tsx
      message-editor.tsx    # textarea + counter + warnings/errors
      whatsapp-preview.tsx
      drawer-actions.tsx
  routes/
    __root.tsx              # QueryClientProvider + <Toaster theme="dark" richColors />
    index.tsx               # / (inbox)
    historico.tsx           # /historico (read-only)
  styles.css                # tokens oklch dark
```

**Regra:** componente novo → arquivo novo. Nada de barrel exports gigantes. Imports relativos curtos (`@/components/...`).

---

## 4. Supabase — referência

**URL:** `https://ehlpmukjdknnyhkycncb.supabase.co`
**Project ref:** `ehlpmukjdknnyhkycncb`

### 4.1 Tabelas

#### `wts_auto_followup_log` (a tabela central do app)

Tipos relevantes do row:

```ts
type SuggestionRow = {
  id: number;
  client_handle: string;              // sempre 'itupeva' por enquanto
  session_id: string;
  customer_phone: string | null;      // formato WTS, ex: '+5511912345678'
  customer_name: string | null;       // session.title do WTS

  classified_at: string;              // timestamptz
  mode: 'shadow' | 'executed' | 'skipped_not_fu' | 'skipped_low_conf' | 'skipped_cooldown' | 'error';
  is_followup: boolean | null;        // DEPRECATED — usar suggest_message
  suggest_message: boolean | null;    // true = sugere mensagem, false = só tag/coluna
  confidence: number | null;          // 0..1

  tag_applied: string | null;         // nome da tag (não id)
  column_applied: string | null;      // composite_key "<Painel> > <Etapa>"
  message_sent: string | null;        // texto sugerido pela IA

  reasoning_short: string | null;
  scenario: string | null;
  error_reason: string | null;

  // Action tracking
  action_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'executed' | 'failed' | null;
  human_message_override: string | null;
  actioned_by: string | null;         // 'Murilo' | 'Lucas'
  actioned_at: string | null;

  wts_tag_applied_at: string | null;
  wts_card_moved_at: string | null;
  wts_message_sent_at: string | null;
  wts_errors: Record<string, { ok: boolean; status?: number; error?: string }> | null;

  card_action: 'moved' | 'created' | 'skipped' | 'failed' | null;
  card_id_used: string | null;

  raw_classifier_json: unknown;
  raw_session_meta: unknown;
};
```

**Estados do `action_status`:**
- `pending` → na inbox, aguardando humano.
- `executed` → todas (ou ao menos a mensagem) sub-ações WTS deram OK.
- `failed` → toda sub-ação falhou (token errado, contato sumiu, etc).
- `rejected` → humano descartou.
- `expired` → sessão ficou muito velha pra agir (>72h, regra do classificador).

#### `wts_panel_mapping`
Cache local de painéis WTS. Lookup principal: `composite_key` ("`Painel Comercial - Gestor CRM > Em andamento`") → `(panel_id, step_id)`.

#### `wts_auto_followup_runs`
Resumo por execução do workflow n8n pai. **App não escreve aqui.** Pode ler para uma tela de "saúde do pipeline" futura.

#### `_secrets`
Tokens por cliente. Lookup: `(client_handle, key='tokenwts') → value`. **Frontend não lê isto.** O token do browser vem de env var Vercel.

### 4.2 RLS

- `wts_auto_followup_log`: **RLS desligada** (migration `2026-05-11e`). App lê/escreve via anon key.
- `wts_panel_mapping`: **RLS desligada** (mapping não é sensível).
- `wts_auto_followup_runs`: RLS ligada (admin-only).
- `_secrets`: RLS ligada (service_role-only).

Trade-off documentado em `2026-05-11e_disable_rls_lovable_simples.sql`. **Não reativar sem antes implementar Auth no app.**

### 4.3 Realtime

Tabela `wts_auto_followup_log` está em `supabase_realtime` publication. Hook `use-realtime` deve:
1. Subscribe `postgres_changes` (evento `*`) na tabela com filtro `client_handle=eq.itupeva`.
2. Em qualquer evento → `queryClient.invalidateQueries({ queryKey: ['suggestions'] })`.
3. Expor estado de conexão (`SUBSCRIBED` | `CONNECTING` | `CLOSED`) para o header (badge Live/Offline).
4. Se `!SUBSCRIBED` após 10s, `useQuery` ativa `refetchInterval: 30000` como fallback.

---

## 5. WTS Chat API — referência crítica

> Documentação detalhada em `docs/wts-api-reference.md` no monorepo de referência. Aqui o essencial pra implementar `lib/wts.ts`.

### 5.1 Base
- **URL:** `https://api.wts.chat`
- **Header de auth:** `Authorization: <token>` **(SEM `Bearer`)** + `accept: application/json`
- **Token Itupeva:** env var `VITE_WTS_TOKEN_ITUPEVA` (Vercel → Settings → Environment Variables, escopo Production+Preview)
- **WhatsApp `from` Itupeva:** `5511913352918`
- **Rate limit:** ~1.5 req/s. **Sempre `sleep(700)` entre chamadas sequenciais** no fluxo de aprovação.

### 5.2 Endpoints usados (5 calls do `approve`)

| # | Método | Path | Body | Retorna |
|---|---|---|---|---|
| 1 | `POST` | `/core/v1/contact/phonenumber/{phone}/tags` | `{ tagNames: [tag], operation: 'InsertIfNotExists' }` | 200 |
| 2 | `GET` | `/core/v1/contact/phonenumber/{phone}` | — | `{ id, name, phoneNumber, ... }` |
| 3 | `GET` | `/crm/v1/panel/card?PanelId=...&ContactId=...&PageSize=5` | — | `{ items: [...] }` ou array |
| 4a | `PUT` | `/crm/v2/panel/card/{card_id}` (se existe) | `{ stepId }` | 200 |
| 4b | `POST` | `/crm/v1/panel/card` (se não existe) | `{ panelId, stepId, contactId }` | `{ id, ... }` |
| 5 | `POST` | `/chat/v1/message/send` | `{ body: { text }, to: '55'+digits, from: '5511913352918' }` | 200 |

### 5.3 Helpers `lib/wts.ts` — assinaturas

```ts
type WtsResult<T = unknown> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function wtsApplyTag(phone: string, tag: string): Promise<WtsResult>;
export async function wtsGetContact(phone: string): Promise<WtsResult<{ id: string; name?: string }>>;
export async function wtsGetCards(panelId: string, contactId: string): Promise<WtsResult<{ id: string }[]>>;
export async function wtsMoveCard(cardId: string, stepId: string): Promise<WtsResult>;
export async function wtsCreateCard(panelId: string, stepId: string, contactId: string): Promise<WtsResult<{ id: string }>>;
export async function wtsSendMessage(phone: string, text: string): Promise<WtsResult>;
```

**Todos retornam `WtsResult` discriminado** — nunca jogar `throw`. A camada de mutation acumula erros no objeto `wts_errors` para persistir no log.

### 5.4 Quirks que JÁ machucaram (preservar conhecimento)

- **`Authorization` sem `Bearer`.** Bearer dá 401 "Acesso negado".
- **`/core/v1/tag` retorna array nu**, não envelope. Outros endpoints retornam `{ items: [...] }`.
- Move card é **`/crm/v2/`**, não v1. v1 não aceita PUT.
- Filtrar painéis comerciais por `scope === 'COMPANY'`. `USER` é "Minhas tarefas" pessoais.
- Campo do painel é `title`, não `name`. Steps têm `name`.
- `LastInteractionDate.After` **não existe** — usar `UpdatedAt.After`.
- 429 → backoff 30s. Mas no fluxo de aprovação um único usuário não deve bater rate limit; o `sleep(700)` resolve.

---

## 6. Fluxos de negócio

### 6.1 Aprovar (mutation `use-approve`)

```ts
// Pseudocódigo — implementação em src/hooks/use-approve.ts

async function approve(row: SuggestionRow, override?: string) {
  const errors: Record<string, WtsResult> = {};
  const ts = () => new Date().toISOString();
  const updates: Partial<SuggestionRow> = {
    actioned_by: getOperator(),
    actioned_at: ts(),
    human_message_override: override ?? null,
  };

  // 1. Tag
  if (row.tag_applied && row.customer_phone) {
    errors.apply_tag = await wtsApplyTag(row.customer_phone, row.tag_applied);
    if (errors.apply_tag.ok) updates.wts_tag_applied_at = ts();
    await sleep(700);
  }

  // 2-4. Card (resolve contact → busca card → move ou cria)
  if (row.column_applied && row.customer_phone) {
    const mapping = panelMapping.get(row.column_applied);
    if (!mapping) {
      errors.card = { ok: false, status: 0, error: `composite_key_not_found:${row.column_applied}` };
    } else {
      const contactRes = await wtsGetContact(row.customer_phone);
      await sleep(700);
      if (!contactRes.ok) {
        errors.card = contactRes;
      } else {
        const cardsRes = await wtsGetCards(mapping.panel_id, contactRes.data.id);
        await sleep(700);
        if (!cardsRes.ok) {
          errors.card = cardsRes;
        } else if (cardsRes.data.length > 0) {
          const moveRes = await wtsMoveCard(cardsRes.data[0].id, mapping.step_id);
          errors.card = moveRes;
          if (moveRes.ok) {
            updates.wts_card_moved_at = ts();
            updates.card_action = 'moved';
            updates.card_id_used = cardsRes.data[0].id;
          }
          await sleep(700);
        } else {
          const createRes = await wtsCreateCard(mapping.panel_id, mapping.step_id, contactRes.data.id);
          errors.card = createRes;
          if (createRes.ok) {
            updates.wts_card_moved_at = ts();
            updates.card_action = 'created';
            updates.card_id_used = createRes.data.id;
          }
          await sleep(700);
        }
      }
    }
  }

  // 5. Mensagem (só se suggest_message=true)
  if (row.suggest_message) {
    const text = (override ?? row.message_sent ?? '').trim();
    if (!text) {
      errors.send_message = { ok: false, status: 0, error: 'empty_message' };
    } else if (!row.customer_phone) {
      errors.send_message = { ok: false, status: 0, error: 'no_phone' };
    } else {
      errors.send_message = await wtsSendMessage(row.customer_phone, text);
      if (errors.send_message.ok) updates.wts_message_sent_at = ts();
    }
  }

  // Persist
  const requested = Object.keys(errors);
  const allOk = requested.every(k => errors[k].ok);
  updates.action_status = allOk ? 'executed' : (Object.values(errors).some(r => r.ok) ? 'executed' : 'failed');
  updates.wts_errors = errors;

  await supabase.from('wts_auto_followup_log').update(updates).eq('id', row.id);

  return { allOk, errors };
}
```

**Bulk approve:** `Promise.allSettled` com **concorrência 5** (chunks). Cada chunk respeita o `sleep` interno; rate limit não estoura porque WTS aceita ~1.5 rps e 5 paralelos × 5 calls × 700ms = ~3.5s/chunk.

### 6.2 Rejeitar (mutation `use-reject`)

```ts
await supabase.from('wts_auto_followup_log').update({
  action_status: 'rejected',
  actioned_by: getOperator(),
  actioned_at: new Date().toISOString(),
}).eq('id', row.id);
```

**Zero chamadas WTS.** Toast verde "Sugestão rejeitada".

### 6.3 Estados visuais por `action_status`

| Status | Onde aparece | Ação UI |
|---|---|---|
| `pending` | `/` inbox | Editável, botões ativos |
| `executed` | `/historico` | Read-only, badge verde |
| `rejected` | `/historico` | Read-only, badge cinza |
| `failed` | `/historico` (filtrável) | Read-only, badge vermelho + tooltip com `wts_errors` |
| `expired` | `/historico` | Read-only, badge âmbar |

---

## 7. Validação de mensagens

`lib/validation.ts`:

```ts
const MSG_MIN = 40;
const MSG_MAX = 600;
const BANNED_PHRASES = ['aproveite', 'última chance', 'desconto especial', 'oferta imperdível', 'corra'];

export function validateMessage(input: string): {
  valid: boolean;
  warnings: string[];
  errors: string[];
  cleaned: string;
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  let cleaned = input;

  // 1. Substitui travessão (tell de IA) — vira warning
  if (cleaned.includes('—')) {
    cleaned = cleaned.replace(/ — /g, ', ').replace(/—/g, ', ');
    warnings.push('Travessão substituído por vírgula');
  }

  // 2. Tamanho
  if (cleaned.length < MSG_MIN) errors.push(`Mínimo ${MSG_MIN} caracteres (atual: ${cleaned.length})`);
  if (cleaned.length > MSG_MAX) errors.push(`Máximo ${MSG_MAX} caracteres (atual: ${cleaned.length})`);

  // 3. Banidas
  const lower = cleaned.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) errors.push(`Frase comercial agressiva: "${phrase}"`);
  }

  return { valid: errors.length === 0, warnings, errors, cleaned };
}
```

UI: textarea mostra contador, warnings em amarelo (não bloqueia), errors em vermelho (desabilita botão Aprovar).

---

## 8. Design system

### 8.1 Filosofia

> "Concrete Silence" — quase monocromático, generoso em whitespace, hierarquia tipográfica clara. Editorial, não comercial. Sem decoração que grita "AI-generated".

### 8.2 Paleta (oklch, tema dark único)

```css
/* styles.css */
:root {
  --background: oklch(0.13 0 0);           /* zinc-950 ~ */
  --foreground: oklch(0.97 0 0);
  --muted: oklch(0.20 0 0);
  --muted-foreground: oklch(0.65 0 0);
  --card: oklch(0.16 0 0);
  --card-foreground: oklch(0.97 0 0);
  --border: oklch(0.24 0 0);
  --input: oklch(0.20 0 0);
  --primary: oklch(0.85 0.18 95);          /* amarelo editorial, não neon */
  --primary-foreground: oklch(0.18 0 0);
  --destructive: oklch(0.60 0.20 25);
  --ring: oklch(0.55 0.10 95);
  --radius: 0.5rem;
}
```

**Regra:** nada de gradients, nada de shadows fortes, nada de glow. Bordas finas (`1px`), separação por whitespace e tipografia.

### 8.3 Tipografia

- **Sans:** Inter (default Tailwind). `font-medium` para títulos de seção, `font-normal` para corpo.
- **Mono:** JetBrains Mono ou ui-monospace para IDs, telefones, timestamps.
- **Tamanhos:** `text-xs` para metadados, `text-sm` default UI, `text-base` apenas em mensagens longas.

### 8.4 Componentes-chave

**Botões (shadcn `Button`):**
- `variant="default"` — ação primária (Aprovar). `bg-primary text-primary-foreground hover:bg-primary/90`.
- `variant="outline"` — secundária (Cancelar, Voltar).
- `variant="ghost"` — terciária, hover discreto.
- `variant="destructive"` — só para destruição irreversível (raro neste app).
- **Estado de loading:** spinner Lucide `Loader2 className="animate-spin"` + texto `"Aprovando..."`. Botão fica `disabled` durante a mutation.
- **Confirmação destrutiva:** AlertDialog (shadcn). Usar para "Aprovar X selecionadas?" no bulk.

**Tabela:**
- `border-b border-border` em rows, sem `border-x`.
- `hover:bg-muted/40` row hover.
- Row selecionada: `bg-muted/60` + `border-l-2 border-primary`.
- Header `sticky top-0 bg-background z-10`.
- Densidade compacta: `py-2 px-3` nas células.

**Drawer (shadcn `Sheet`):**
- Largura `sm:max-w-[600px]`.
- Padding interno `p-6`.
- Seções separadas por `Separator` (shadcn), não por bordas.
- Footer com botões `flex justify-end gap-2`, sticky no fundo se conteúdo overflowa.

**Badges:**
- `Type` (Msg | Tag): outline finos com texto. Msg = primary, Tag = muted.
- `Scenario`: mapping `SCENARIO_COLORS` em `constants.ts`. Cores levemente saturadas, sem brilho.
- `Confidence`: arredondado para 2 casas, cor por faixa (≥0.85 primary, 0.70–0.84 muted-foreground, <0.70 destructive/60).

### 8.5 Microinterações

- **Hover delay:** `transition-colors duration-150`.
- **Sem animação de entrada exagerada:** drawer pode usar slide nativo do shadcn; toasts usam Sonner default.
- **Foco visível:** `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`. Acessibilidade não negociável.
- **Loading skeleton** em vez de spinner para a tabela na primeira carga: shadcn `Skeleton` 8 rows.

### 8.6 Ícones (lucide-react)

| Uso | Ícone |
|---|---|
| Aprovar | `Check` |
| Rejeitar | `X` |
| Live indicator | `Circle` (filled, pulse) |
| Refresh | `RefreshCw` |
| Filtros | `Filter` |
| Editar | `Pencil` |
| Histórico | `History` |
| Erro | `AlertCircle` |
| Sucesso | `CheckCircle2` |
| Mensagem | `MessageSquare` |
| Tag | `Tag` |
| Loading | `Loader2` (animate-spin) |

**Tamanho default:** `h-4 w-4`. Em botões: `mr-2`.

---

## 9. Deploy (Vercel)

### 9.1 Setup inicial

```bash
# Conecta repo ao Vercel
vercel link

# Env vars (production + preview)
vercel env add VITE_SUPABASE_URL production
# https://ehlpmukjdknnyhkycncb.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# <anon key do projeto>

vercel env add VITE_WTS_TOKEN_ITUPEVA production
# <token WTS Itupeva — buscar em _secrets ou no painel WTS>
```

**Repetir para `preview`.** Não setar em `development` (usar `.env.local` na máquina).

### 9.2 `.env.local` (gitignored)

```env
VITE_SUPABASE_URL=https://ehlpmukjdknnyhkycncb.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_WTS_TOKEN_ITUPEVA=...
```

### 9.3 Build

TanStack Start no Vercel: detecção automática. `vercel.json` só se precisar redirects/headers customizados. Build command default `npm run build`, output `.vercel/output` (auto).

### 9.4 Domínio

`aios-inteligence.vercel.app` por enquanto. Domínio próprio depois (`inteligencia.aios.com.br` ou subdomain do AIOS principal).

---

## 10. Convenções de código

- **TS strict:** `"strict": true`, `"noUncheckedIndexedAccess": true`. Não usar `any` (use `unknown` + narrowing).
- **Sem default exports** em componentes; named exports facilitam refactor.
- **Hooks:** sempre prefixo `use-`, um arquivo por hook.
- **Tipos:** centralizados em `lib/types.ts`. Componentes derivam via `Pick`/`Omit` se necessário.
- **Imports:** ordem ESLint padrão — externos → `@/` → relativos. Sem barrel files.
- **Tailwind:** classes ordenadas com `prettier-plugin-tailwindcss` (instalar).
- **Comentários:** em PT-BR quando explicam decisão de negócio; em inglês quando são técnicos puros (raros — código bom não precisa de comentário).
- **Datas:** sempre `date-fns` com locale `ptBR`. Nunca `toLocaleString` direto.
- **Telefone:** dois helpers separados em `format.ts`:
  - `normalizePhoneBR(input)` → string só dígitos com prefixo 55 (pra WTS `to`).
  - `anonymizePhone(input)` → `+55 (11) 9****-5678` (pra UI).

### 10.1 Estilo de mensagem de commit

`<área>: <ação curta>` em PT-BR. Exemplos:
- `inbox: ajusta hover de row e padding`
- `wts: trata 429 com toast e mantém row pending`
- `drawer: adiciona preview WhatsApp e contador`

---

## 11. O que NÃO fazer

- ❌ **Reativar RLS** sem antes ter auth real. Quebra o app.
- ❌ **Voltar a usar a Edge Function `wts-action`.** Ela vive no monorepo de referência só como histórico. O app fala direto com WTS.
- ❌ **Adicionar `Bearer ` antes do token WTS.** 401 garantido.
- ❌ **Pular o `sleep(700)`** no fluxo de aprovação. Rate limit estoura em bulk.
- ❌ **Esquecer de normalizar telefone** antes do `to` no `sendMessage`. `(11) 99999-9999` quebra.
- ❌ **Tema light, gradients, glows, emojis na UI.** Brand é minimalista.
- ❌ **Adicionar libs pesadas** (Redux, Formik, MUI). Stack já cobre.
- ❌ **Misturar lógica de mutation com componente.** Sempre em hook `use-*.ts`.
- ❌ **Throw em helpers WTS.** Retornar `WtsResult` discriminado para mutation poder agregar.
- ❌ **Commitar `.env.local`** ou token em código.

---

## 12. Roadmap / TODO

Ordem sugerida para o Claude Code priorizar:

### Imediato (sprint atual)
- [ ] Refinar design do header (logo + Live + Refresh + operator switch) seguindo §8.
- [ ] Reestilizar botões (primary, outline, ghost) com estados loading bonitos.
- [ ] Tabela: skeleton de loading, empty state com Lucide + texto.
- [ ] Drawer: WhatsApp preview mais fiel (bolha verde claro, timestamp).
- [ ] Tratamento de erro: ao falhar mutation, toast destrutivo com botão "Ver detalhes" abrindo modal com `wts_errors`.

### Curto prazo
- [ ] Tela `/historico` com filtros (período, status, scenario, actioned_by).
- [ ] Bulk approve com progress bar real (X de Y concluídos).
- [ ] Atalhos de teclado: `J/K` navegar rows, `A` aprovar, `R` rejeitar, `Esc` fechar drawer.
- [ ] Health badge no header mostrando última `wts_auto_followup_runs` (delta tempo + status).

### Médio prazo
- [ ] Tela de saúde do pipeline (`/pipeline`) com chart das runs últimas 7d.
- [ ] Multi-cliente: estrutura pronta no schema (`client_handle`), falta tela de seletor + isolar env vars por cliente. Adicionar entrada em `WHATSAPP_FROM_BY_CLIENT` em constants.
- [ ] Auth real (Supabase Auth com magic link) + reativar RLS.

### Longo prazo
- [ ] Migrar chamadas WTS para API Routes (Vercel server) sem mudar a interface dos helpers. Move token pra server-side.
- [ ] Webhooks WTS → tabela de eventos pra reconciliar quando UI WTS muda sem passar pela gente.

---

## 13. Glossário

- **AIOS** — empresa do usuário (consultoria digital).
- **Synkra** — orquestrador de agentes do AIOS que roda em produção fazendo classificação e (futuro) execução automatizada.
- **WTS / WTS Chat** — plataforma de WhatsApp Business + CRM kanban que a clínica usa (antigo `flw.chat`).
- **FU / Follow-up** — mensagem que reativa cliente que sumiu do funil.
- **Composite key** — string `"Painel > Etapa"` usada para resolver `(panel_id, step_id)` via `wts_panel_mapping`.
- **Shadow mode** — workflow IA roda mas só registra, não executa nem manda mensagem. Atual estado de produção.
- **Itupeva** — primeira clínica cliente (Forma de Ser, Itupeva-SP). Single-tenant do app por enquanto.

---

## 14. Contato e contexto

- **Owner:** Aios (PT-BR, comunicação direta, sem floreio).
- **Operadores diários:** Murilo e Lucas (consultores comerciais da Itupeva).
- **Cliente final:** Forma de Ser — clínica de estética, alto ticket, atendimento humano valorizado. **Mensagens FU não podem soar de IA.**

Quando em dúvida sobre uma decisão de UX ou copy: **clean, editorial, humano**. Quando em dúvida sobre erro WTS: **olhe `wts_errors` no log antes de chutar**. Quando algo der ruim em produção: **rejection é grátis, reprocessar é fácil — não tente "consertar" com hotfix no browser**.

---

*Última atualização: 2026-05-12. Atualize este arquivo a cada decisão arquitetural relevante.*
