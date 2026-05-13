# Edge Function: `wts-action`

Executa uma ação de follow-up aprovada pelo humano via Lovable app embedado no AIOS.

## Fluxo

```
Lovable UI
  ├─ Usuário (Murilo/Lucas) vê FU sugerido pela IA
  ├─ Edita a mensagem se quiser
  └─ Clica "Aprovar e enviar"
       │
       ▼
POST /functions/v1/wts-action
  { log_id: 123, message_override: "...", actioned_by: "murilo" }
       │
       ▼
Edge Function
  1. Lê log em wts_auto_followup_log (precisa action_status=pending)
  2. Lê WTS token de _secrets (por client_handle)
  3. Resolve panel/step de wts_panel_mapping (por column_applied)
  4. POST  /core/v1/contact/phonenumber/{phone}/tags    (aplica tag)
  5. GET   /core/v1/contact/phonenumber/{phone}          (resolve contact_id)
  6. GET   /crm/v1/panel/card?PanelId&ContactId          (resolve card_id)
  7. PUT   /crm/v2/panel/card/{card_id}                  (move card)
  8. POST  /chat/v1/message/send                          (envia mensagem)
  9. UPDATE wts_auto_followup_log SET action_status, timestamps, wts_errors
 10. Retorna { status, log_id, actions: {...} }
```

## Healthcheck (sem efeito colateral)

```
GET /functions/v1/wts-action?healthcheck=1
```

Retorna 200 com:
```json
{
  "ok": true,
  "function": "wts-action",
  "timestamp": "2026-05-11T...",
  "env": { "has_supabase_url": true, "has_service_role": true }
}
```

Use no Lovable `/debug` ou em monitoring externo. Não toca em nenhuma tabela nem chama WTS.

## Deploy

```bash
# Primeira vez:
supabase functions deploy wts-action --project-ref ehlpmukjdknnyhkycncb

# Updates:
supabase functions deploy wts-action --project-ref ehlpmukjdknnyhkycncb
```

Não precisa setar env vars manualmente — `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente pelo runtime do Supabase Functions.

## Local (development)

```bash
cd clientes/fd-itupeva/supabase
supabase functions serve wts-action --env-file .env.local
```

`.env.local` precisa de:
```
SUPABASE_URL=https://ehlpmukjdknnyhkycncb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

## Request shape

```json
POST /functions/v1/wts-action
Headers:
  Authorization: Bearer <supabase_jwt_or_anon_key>
  Content-Type: application/json

Body:
{
  "log_id": 123,
  "message_override": "Texto opcional editado pelo user...",
  "actioned_by": "murilo"
}
```

## Response shapes

### Sucesso total (HTTP 200)
```json
{
  "status": "executed",
  "log_id": 123,
  "actions": {
    "apply_tag": { "ok": true, "status": 200 },
    "resolve_contact": { "ok": true },
    "get_card": { "ok": true },
    "move_card": { "ok": true },
    "send_message": { "ok": true }
  }
}
```

### Sucesso parcial (HTTP 200, action_status="executed" mas alguma sub-ação falhou)
```json
{
  "status": "executed",
  "log_id": 123,
  "actions": {
    "apply_tag": { "ok": true },
    "move_card": { "ok": false, "error": "no_card_for_contact_in_panel" },
    "send_message": { "ok": true }
  }
}
```

Mensagem foi enviada, tag aplicada, mas o card não pôde ser movido (cliente ainda não tinha card no painel). Operação é considerada bem-sucedida porque a mensagem chegou; UI deve mostrar o detalhe pra o user saber.

### Falha total (HTTP 200, action_status="failed")
```json
{
  "status": "failed",
  "log_id": 123,
  "actions": {
    "apply_tag": { "ok": false, "status": 401, "error": "Acesso negado" },
    "send_message": { "ok": false, "status": 401, "error": "Acesso negado" }
  }
}
```

Provável: token WTS expirado ou _secrets desatualizado.

### Erros de validação (HTTP 400/404/409)

- **400 `invalid_json`** — body não é JSON
- **400 `missing_fields`** — falta `log_id` ou `actioned_by`
- **400 `no_message_to_send`** — `message_override` vazio E `message_sent` original também
- **404 `log_not_found`** — log_id não existe
- **409 `log_not_pending`** — log já foi tratado (action_status != pending). Inclui `current_status`.
- **500 `wts_token_missing`** — não achou token em `_secrets` para o client_handle
- **500 `log_update_failed`** — Supabase rejeitou o UPDATE no log (raro)

## Tabelas envolvidas

### Leitura
- `wts_auto_followup_log` — registro do FU sugerido pela IA
- `_secrets` — token WTS do cliente (key='tokenwts')
- `wts_panel_mapping` — lookup `Painel > Etapa` → `(panel_id, step_id)`

### Escrita
- `wts_auto_followup_log` — UPDATE com timestamps, action_status, wts_errors, actioned_by, human_message_override

## Segurança

- Função usa `service_role` interno (env vars injetadas pelo Supabase runtime) — pode escrever em qualquer tabela.
- Auth do caller: por padrão Supabase Functions exige JWT válido (anon key serve para chamadas autenticadas client-side). Usuário precisa estar logado no Supabase Auth do AIOS.
- Se quiser endurecer: chamar com `--no-verify-jwt` no deploy e validar custom header `X-AIOS-Token` contra env var.

## Manutenção

### Atualizar mapping de painéis
Quando a clínica adicionar/renomear painéis ou steps no WTS:
```sql
-- Refazer mapping pra um client/painel específico
DELETE FROM wts_panel_mapping WHERE client_handle='itupeva' AND panel_id='<id>';
-- Depois rodar um helper que faz GET /crm/v1/panel/{id}?IncludeDetails=Steps
-- e popula. Por ora é manual; pode virar Routine.
```

### Adicionar suporte a novo cliente
1. Adicionar entrada em `WHATSAPP_FROM_BY_CLIENT` no `index.ts`
2. Garantir `_secrets` tem row com `(client_handle=<novo>, key='tokenwts', value='<token>')`
3. Popular `wts_panel_mapping` com os painéis comerciais desse cliente
4. Deploy:
   ```bash
   supabase functions deploy wts-action --project-ref ehlpmukjdknnyhkycncb
   ```
