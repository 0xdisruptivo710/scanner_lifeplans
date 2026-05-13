# AIOS Inteligence

App interno de revisão e aprovação de follow-ups gerados pela IA AIOS para a clínica **Forma de Ser (Itupeva)**.

Lê sugestões de uma tabela Supabase alimentada por automação N8N e, ao aprovar, dispara chamadas diretas à WTS Chat API (tag, card, mensagem WhatsApp). Sem backend custom, sem Edge Function, tudo via `fetch` no browser.

> Contexto, schema e fluxos completos: `CLAUDE (3).md`.

---

## Stack

- Vite + React 18 + TypeScript
- TanStack Router (declarativo) + TanStack Query + TanStack Table
- Tailwind CSS (tema dark único, tokens oklch)
- shadcn-style UI sobre Radix UI
- `@supabase/supabase-js` (REST + Realtime)
- Sonner (toasts) · lucide-react (ícones) · date-fns (pt-BR)

---

## Desenvolvimento

```bash
npm install
cp .env.example .env.local       # já criado vazio; preencha
npm run dev                      # http://localhost:5173
```

### Variáveis de ambiente

| Var | Origem |
|---|---|
| `VITE_SUPABASE_URL` | `https://ehlpmukjdknnyhkycncb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` ou publishable |
| `VITE_WTS_TOKEN_ITUPEVA` | Supabase tabela `_secrets` (`client_handle='itupeva'`, `key='tokenwts'`) |

> O token WTS fica exposto ao client (assumido — a URL do app não é pública). Para hardening futuro, mover chamadas para uma API Route mantendo a interface dos helpers em `src/lib/wts.ts`.

---

## Estrutura

```
src/
  lib/        constants, supabase, wts (helpers fetch), validation, format, types
  hooks/      use-suggestions, use-history, use-realtime, use-panel-mapping,
              use-approve, use-reject, use-operator
  components/
    layout/   app-header, filter-tabs, bulk-action-bar
    table/    suggestions-table, columns, type/scenario/confidence badges, empty-state
    drawer/   suggestion-drawer, tag-select, column-select, message-editor,
              whatsapp-preview, drawer-actions
    ui/       button, badge, sheet, select, tabs, slider, checkbox, table, …
  routes/     __root, index (/), historico (/historico)
  data/       tags-itupeva.json (catálogo curado)
  router.tsx  monta o routeTree
  main.tsx    QueryClient + RouterProvider
  styles.css  tokens oklch dark
```

---

## Fluxo de aprovação

5 chamadas sequenciais à WTS, com `sleep(700ms)` entre cada (rate limit ~1.5 req/s):

1. `POST /core/v1/contact/phonenumber/{phone}/tags` — aplica tag
2. `GET /core/v1/contact/phonenumber/{phone}` — resolve contact_id
3. `GET /crm/v1/panel/card?PanelId&ContactId` — busca card existente
4. `PUT /crm/v2/panel/card/{id}` *(move)* **ou** `POST /crm/v1/panel/card` *(cria)*
5. `POST /chat/v1/message/send` — envia WhatsApp (só se `suggest_message=true`)

Todo o resultado vai em `wts_errors` (jsonb) e `wts_*_at` timestamps no row. Bulk approve usa concorrência 5 e barra de progresso real.

Rejeitar é só `UPDATE` no Supabase — zero chamadas WTS.

---

## Deploy na Vercel

```bash
npm i -g vercel
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_WTS_TOKEN_ITUPEVA production
# repetir para preview
vercel deploy --prod
```

`vercel.json` já tem framework `vite`, build `npm run build`, output `dist`, e rewrite SPA `/(.*) → /index.html`. Vercel detecta automaticamente.

---

## O que NÃO fazer

- Não reativar RLS sem antes implementar Auth.
- Não usar `Bearer ` antes do token WTS (401 garantido).
- Não pular `sleep(700)` no fluxo de aprovação.
- Não esquecer de normalizar telefone (`55<digits>`) antes de `sendMessage`.
- Não usar emojis em UI labels (use lucide-react).
- Não usar tema light, gradients, glows.
- Não voltar à Edge Function `wts-action` (descontinuada para este app).
