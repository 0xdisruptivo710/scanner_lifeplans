# Lovable Prompt — AIOS Inteligence (Itupeva)

App **interno** embedado no painel AIOS. Mostra sugestões de ação CRM geradas por IA e deixa o operador aprovar com 1 clique. NÃO é multi-tenant, NÃO tem login, NÃO usa Edge Function.

Cole esse documento inteiro no Lovable. Em seguida, cole os 2 anexos (`wts-api-reference.md` e `tags_itupeva_curado.json`).

Antes de colar, substitua:
- `<SUPABASE_ANON_KEY>` → anon public key do projeto Supabase (Dashboard → Settings → API)
- `<WTS_TOKEN_ITUPEVA>` → token WTS de Itupeva (em `.env` do cliente: `tokenwts`)

---

## CONTEXTO

App de uso interno de uma agência de CRM. Operadores (Murilo, Lucas) revisam sugestões da IA, editam mensagem se quiser, aprovam ou rejeitam. Aprovação dispara chamadas WTS direto do browser (5 fetches sequenciais). Rejeição é um UPDATE direto na tabela Supabase.

**Cliente único:** `itupeva` (Face Doctor Itupeva, clínica de estética).

**Sem multi-tenant.** Se outro cliente quiser, duplica o projeto Lovable trocando 4 constantes (token WTS, WhatsApp `from`, painel padrão, anon key).

**Sem login.** RLS desligada nas tabelas usadas pelo app. Anon key publica é suficiente. URL não será compartilhada externamente.

**Sem Edge Function.** O próprio app chama a API WTS direto via fetch.

---

## STACK

- **TanStack Start** (template Lovable padrão) — file-based routing em `src/routes/`
- TypeScript + Vite
- Tailwind CSS (tema dark, ver paleta abaixo)
- `@supabase/supabase-js` v2.x
- TanStack Table v8 + TanStack Query v5
- shadcn/ui (Sheet, Table, Tabs, Button, Badge, Select, Textarea, Slider, Checkbox)
- date-fns (locale pt-BR)
- Sonner (toasts)
- Lucide React (ícones — NÃO use emojis)

---

## CONSTANTES (hardcode em `src/lib/constants.ts`)

```ts
// Supabase
export const SUPABASE_URL = 'https://ehlpmukjdknnyhkycncb.supabase.co';
export const SUPABASE_ANON_KEY = '<SUPABASE_ANON_KEY>';

// WTS API — Itupeva
export const WTS_BASE = 'https://api.wts.chat';
export const WTS_TOKEN = import.meta.env.VITE_WTS_TOKEN_ITUPEVA || '<WTS_TOKEN_ITUPEVA>';
export const WHATSAPP_FROM = '5511913352918';
export const CLIENT_HANDLE = 'itupeva';

// Painel padrão (caso column_applied não encontre mapping)
export const DEFAULT_PANEL_ID = '82b8ab1a-6945-4e63-a098-a7cf85a831cd'; // Painel Comercial - Gestor CRM

// Cores dos scenarios
export const SCENARIO_COLORS: Record<string, string> = {
  orcamento_sem_resposta:     'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  pergunta_sem_resposta:      'bg-orange-500/20 text-orange-300 border-orange-500/40',
  agendamento_incompleto:     'bg-blue-500/20 text-blue-300 border-blue-500/40',
  interesse_silencio:         'bg-purple-500/20 text-purple-300 border-purple-500/40',
  tag_only_no_engagement:     'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
  tag_only_atendimento_ativo: 'bg-green-500/20 text-green-300 border-green-500/40',
  tag_only_negocio_fechado:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  tag_only_generic:           'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
};

// Validação de mensagem
export const MSG_MIN = 40;
export const MSG_MAX = 600;
export const BANNED_PHRASES = ['aproveite', 'última chance', 'desconto especial'];
```

Coloque o `VITE_WTS_TOKEN_ITUPEVA` nas env vars do Lovable (Settings → Environment Variables) — assim o token não fica no source.

---

## CONFIGURAÇÃO SUPABASE

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }, // sem login; anon key direto
  realtime: { params: { eventsPerSecond: 10 } },
});
```

---

## SCHEMA — fonte de verdade

### `wts_auto_followup_log` (read + update)
1 row = 1 sugestão da IA.

| Campo | Tipo | Significado |
|---|---|---|
| `id` | bigserial PK | ID interno |
| `client_handle` | text | Sempre `'itupeva'` |
| `session_id` | text | UUID da sessão WTS |
| `customer_name` | text \| null | Nome do cliente (vem de `session.title` do WTS) |
| `customer_phone` | text \| null | Telefone (formato variado) |
| `classified_at` | timestamptz | Quando a IA classificou |
| `confidence` | numeric(3,2) | 0.00-1.00 |
| `suggest_message` | bool | true=msg editável, false=só tag |
| `tag_applied` | text | Tag sugerida |
| `column_applied` | text | Coluna sugerida (`<Painel> > <Etapa>`) |
| `message_sent` | text \| null | Texto da msg |
| `reasoning_short` | text | 1 frase da IA |
| `scenario` | text | enum (ver SCENARIO_COLORS) |
| `action_status` | text | `pending`/`executed`/`rejected`/`failed` |
| `actioned_by`, `actioned_at` | text/timestamptz | Quem aprovou/rejeitou |
| `human_message_override` | text \| null | Msg editada |
| `wts_tag_applied_at`, `wts_card_moved_at`, `wts_message_sent_at` | timestamptz \| null | Timestamps de cada sub-ação |
| `card_action` | text \| null | `moved`/`created`/`failed`/`skipped` |
| `card_id_used` | text \| null | UUID do card WTS |
| `wts_errors` | jsonb \| null | Erros detalhados |

### `wts_panel_mapping` (read-only)
Lookup `<Painel> > <Etapa>` → `(panel_id, step_id)`.

```sql
SELECT composite_key, panel_id, step_id, panel_name, step_name
FROM wts_panel_mapping
WHERE client_handle = 'itupeva';
```

24 rows.

---

## WTS API — endpoints que o app chama direto

Auth: header `Authorization: <WTS_TOKEN>` (sem Bearer) em todas. Body em JSON quando aplicável.

### 1) Aplicar tag no contato
```
POST {WTS_BASE}/core/v1/contact/phonenumber/{phone}/tags
Body: { "tagNames": ["NÃO RESPONDE"], "operation": "InsertIfNotExists" }
```

### 2) Resolver contact_id por telefone
```
GET {WTS_BASE}/core/v1/contact/phonenumber/{phone}
Response: { id: "uuid", phoneNumber, name, ... }
```

### 3) Buscar card existente no painel
```
GET {WTS_BASE}/crm/v1/panel/card?PanelId={panel_id}&ContactId={contact_id}&PageSize=5
Response: { items: [{ id, contactId, stepId, panelId, ... }] }
```

### 4a) Mover card (se existe)
```
PUT {WTS_BASE}/crm/v2/panel/card/{card_id}
Body: { "stepId": "<step_id_destino>" }
```

### 4b) Criar card (se não existe)
```
POST {WTS_BASE}/crm/v1/panel/card
Body: { "panelId", "stepId", "contactId" }
```

### 5) Enviar mensagem WhatsApp
```
POST {WTS_BASE}/chat/v1/message/send
Body: {
  "body": { "text": "<mensagem>" },
  "to": "55<phone-digits>",   // 11 dígitos puros + 55
  "from": "5511913352918"      // WhatsApp number Itupeva
}
```

**Rate limit:** ~1.5 req/s. Use `await new Promise(r => setTimeout(r, 700))` entre chamadas.

Detalhes completos no `wts-api-reference.md` que você recebe a seguir.

---

## ESTRUTURA DE ARQUIVOS

```
src/
  lib/
    supabase.ts              # client
    constants.ts             # tudo hardcoded acima
    wts.ts                   # helpers para chamar WTS (fetch wrappers)
    validation.ts            # validateMessage(text)
    format.ts                # anonymizePhone, formatRelativeTime
  hooks/
    use-suggestions.ts       # useQuery pendentes
    use-history.ts           # useQuery histórico
    use-realtime.ts          # canal postgres_changes
    use-panel-mapping.ts     # useQuery wts_panel_mapping
    use-approve.ts           # mutation: chama WTS direto + UPDATE Supabase
  components/
    layout/
      app-header.tsx         # logo + Live/Offline + refresh
      filter-tabs.tsx        # 4 tabs + slider confidence
      bulk-action-bar.tsx
    table/
      suggestions-table.tsx
      columns.tsx
      type-badge.tsx
      scenario-badge.tsx
      confidence-badge.tsx
      empty-state.tsx
    drawer/
      suggestion-drawer.tsx
      tag-select.tsx
      column-select.tsx
      message-editor.tsx
      whatsapp-preview.tsx
      drawer-actions.tsx
  routes/
    __root.tsx
    index.tsx
    historico.tsx
  styles.css                 # tokens dark
```

---

## FLUXO DE APROVAÇÃO (o coração do app)

Hook `use-approve.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { wtsApplyTag, wtsGetContact, wtsGetCards, wtsMoveCard, wtsCreateCard, wtsSendMessage } from '@/lib/wts';

type ApproveInput = {
  log: SuggestionRow;
  messageOverride?: string;
  actionedBy: string;
};

export function useApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ log, messageOverride, actionedBy }: ApproveInput) => {
      const errors: Record<string, any> = {};
      const ts = () => new Date().toISOString();
      const updates: any = {
        actioned_by: actionedBy,
        actioned_at: ts(),
        human_message_override: messageOverride || null,
      };

      // 1) Apply tag
      if (log.tag_applied && log.customer_phone) {
        try {
          await wtsApplyTag(log.customer_phone, log.tag_applied);
          updates.wts_tag_applied_at = ts();
          errors.apply_tag = { ok: true };
        } catch (e: any) {
          errors.apply_tag = { ok: false, error: e.message };
        }
        await sleep(700);
      }

      // 2) Move/create card (só se suggest_message OU se for tag_only sem msg)
      const mapping = await fetchPanelMapping(log.column_applied);
      if (mapping && log.customer_phone) {
        try {
          const contact = await wtsGetContact(log.customer_phone);
          await sleep(700);
          const cards = await wtsGetCards(mapping.panel_id, contact.id);
          await sleep(700);
          if (cards?.[0]?.id) {
            await wtsMoveCard(cards[0].id, mapping.step_id);
            updates.card_action = 'moved';
            updates.card_id_used = cards[0].id;
          } else {
            const newCard = await wtsCreateCard(mapping.panel_id, mapping.step_id, contact.id);
            updates.card_action = 'created';
            updates.card_id_used = newCard.id;
          }
          updates.wts_card_moved_at = ts();
          errors.card = { ok: true };
          await sleep(700);
        } catch (e: any) {
          errors.card = { ok: false, error: e.message };
          updates.card_action = 'failed';
        }
      }

      // 3) Send message (só se suggest_message=true)
      if (log.suggest_message && log.customer_phone) {
        const text = (messageOverride || log.message_sent || '').trim();
        if (text) {
          try {
            await wtsSendMessage(log.customer_phone, text);
            updates.wts_message_sent_at = ts();
            errors.send_message = { ok: true };
          } catch (e: any) {
            errors.send_message = { ok: false, error: e.message };
          }
        }
      }

      // 4) Update log
      const allOk = Object.values(errors).every((r: any) => r.ok);
      updates.action_status = allOk ? 'executed' : 'failed';
      updates.wts_errors = errors;

      const { error: updErr } = await supabase
        .from('wts_auto_followup_log')
        .update(updates)
        .eq('id', log.id);
      if (updErr) throw updErr;

      return { status: updates.action_status, errors };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
```

---

## UI — MUITO ENXUTA

### `/` — Tabela principal

**Header** (sticky, dark):
- Logo "AIOS Inteligence" à esquerda
- Indicador "● Live" / "● Offline" no centro (cor verde/vermelha)
- Botão refresh (Lucide `RefreshCw`)

**Tabs** com contagens:
- `Todas` | `Com mensagem` | `Só tag/coluna` | `Lead frio`

Filtros tab → query client-side sobre o resultado base.

**Slider de confidence** à direita das tabs (0.50-1.00, default 0.75).

**Tabela** (shadcn `<Table>` + TanStack Table v8):

| ☐ | Tipo | Cenário | Cliente | Telefone | Última msg | Conf | Há | Ações |
|---|---|---|---|---|---|---|---|---|
| | badge Msg/Tag | badge cor scenario | `customer_name` ou `—` | `(11) 9****-1234` ou `—` | snippet 80c | 0.92 | 3h | [Ver][Aprovar][✕] |

Coluna "Cliente" mostra `customer_name` (vem de `session.title` do WTS — pode ser "Maria Silva", "(11) 9****-1234" se sem nome, ou null). Se null, usa fallback do telefone formatado. Se ambos null, mostra "—".

Coluna "Telefone" mostra `customer_phone` formatado com `anonymizePhone()`. Se null, mostra "—".

- Click na linha → abre drawer
- Hover → bg-zinc-900
- Selected (checkbox) → bg-zinc-900 + border-l-2 yellow

**Bulk bar** flutuante quando 2+ selecionadas:
```
3 selecionados   [Aprovar todos]   [Rejeitar todos]   [Limpar]
```

### Drawer (Sheet à direita, ~600px)

```
┌────────────────────────────────────────┐
│ ← Voltar                  [Ver no WTS↗]│
│ ────────────────────────────────────── │
│ [Scenario badge] [Conf 0.92]           │
│ Cliente: (11) 9****-1234               │
│ Sessão: abc-123                        │
│ Classificado: há 3 horas               │
│                                        │
│ ── Razão da IA ─────────────────────── │
│ {reasoning_short}                      │
│                                        │
│ ── Ação sugerida ───────────────────── │
│ Tag:    [Select com TAGS_ITUPEVA ▾]   │
│ Coluna: [Select com wts_panel_mapping ▾]│
│                                        │
│ ── Mensagem (se suggest_message=true) ─│
│ ┌──────────────────────────────────┐   │
│ │ <textarea editável>              │   │
│ └──────────────────────────────────┘   │
│ 124/600 chars                          │
│ [⚠ travessão substituído]               │
│ [❌ contém "aproveite"] (desabilita)    │
│                                        │
│ ── Preview WhatsApp ────────────────── │
│ ┌──────────────────────────┐           │
│ │ 🟢 Face Doctor Itupeva    │           │
│ │ <mensagem>               │           │
│ │ 12:34 ✓✓                 │           │
│ └──────────────────────────┘           │
│                                        │
│ [✕ Rejeitar]   [✓ Aprovar e enviar]   │
└────────────────────────────────────────┘
```

Se `suggest_message=false`: oculta textarea e preview. Mensagem informativa:
> "IA não sugere envio de mensagem. Apenas aplica tag e move/cria card."

Botão muda pra `[✓ Aplicar tag e mover card]`.

### `/historico`

Tabela read-only. Filtros: período (7d default), action_status, scenario, actioned_by. Drawer abre em modo read-only (textarea desabilitado, sem botões de ação).

---

## VALIDAÇÃO DE MENSAGEM

```ts
// src/lib/validation.ts
export type Validation = {
  valid: boolean;
  warnings: string[];   // soft (badges, mas não desabilita)
  errors: string[];     // hard (desabilita botão Aprovar)
  cleaned: string;
};

export function validateMessage(input: string): Validation {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Substitui travessão automaticamente
  let cleaned = input;
  if (cleaned.includes('—')) {
    cleaned = cleaned.replace(/—/g, ', ');
    warnings.push('Travessão substituído por vírgula');
  }

  // Tamanho
  if (cleaned.length < 40) errors.push(`Muito curta (${cleaned.length}/40)`);
  if (cleaned.length > 600) errors.push(`Muito longa (${cleaned.length}/600)`);

  // Tom comercial
  const lower = cleaned.toLowerCase();
  for (const phrase of ['aproveite', 'última chance', 'desconto especial']) {
    if (lower.includes(phrase)) errors.push(`Contém "${phrase}"`);
  }

  return { valid: errors.length === 0, warnings, errors, cleaned };
}
```

---

## REALTIME

```ts
// src/hooks/use-realtime.ts
export function useRealtime() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR'>('CONNECTING');

  useEffect(() => {
    const channel = supabase
      .channel('aios-inteligence')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'wts_auto_followup_log' },
        () => qc.invalidateQueries({ queryKey: ['suggestions'] })
      )
      .subscribe((s) => setStatus(s as any));
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return status;
}
```

Polling fallback: se `status !== 'SUBSCRIBED'` por >10s, ativar `refetchInterval: 30000` na useQuery.

---

## ANTI-PADRÕES

- ❌ NÃO use cards em vez de data table
- ❌ NÃO use emojis em UI labels (use Lucide React)
- ❌ NÃO use cores claras ou tema light
- ❌ NÃO crie tela de login (não tem)
- ❌ NÃO crie tela de Settings (V2)
- ❌ NÃO crie dropdown de cliente funcional (V2)
- ❌ NÃO chame Edge Function (não existe; chama WTS direto)
- ❌ NÃO use travessão `—` em UI ou em mensagens enviadas
- ❌ NÃO armazene constantes em mais de um lugar (tudo em `constants.ts`)

---

## CRITÉRIOS DE ACEITAÇÃO

- [ ] Página `/` mostra data table com sugestões pendentes
- [ ] Tabs filtram corretamente com contagens
- [ ] Sort por coluna (TanStack Table)
- [ ] Bulk select + bulk approve (Promise.allSettled, concorrência 5)
- [ ] Click numa linha abre drawer com todos os campos
- [ ] Tag e Coluna editáveis via Select
- [ ] Textarea com validação live (40-600, troca travessão, bloqueia phrases banidas)
- [ ] Preview WhatsApp da mensagem editada
- [ ] Botão Aprovar dispara 3-5 fetches WTS sequenciais com 700ms entre cada
- [ ] Toast verde/vermelho conforme resultado
- [ ] Row some da inbox após aprovar/rejeitar
- [ ] Realtime atualiza tabela sem refresh
- [ ] Indicador Live/Offline funcional
- [ ] Página `/historico` com filtros e drawer read-only
- [ ] Tema dark consistente (oklch tokens em styles.css)
- [ ] Mobile responsivo
- [ ] Empty state amigável

---

## CHECKLIST DEPOIS QUE LOVABLE TERMINAR

1. **Env var**: setar `VITE_WTS_TOKEN_ITUPEVA` em Settings → Environment Variables do Lovable
2. **Anon key**: confirmar que está no `constants.ts` correto
3. **Preview load**: tabela popula sem login
4. **Aprovar 1 row de teste**:
   - Confidence baixo (0.75-0.80, menos crítico)
   - `suggest_message=true` pra testar fluxo completo
   - Verificar que: tag aparece no contato WTS, card movido no painel, mensagem chegou no WhatsApp
5. Se OK, marcar `active=true` no n8n pra cron rodar 9h todo dia
