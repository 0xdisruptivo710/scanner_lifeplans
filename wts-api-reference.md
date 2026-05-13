# PRD — WTS API Reference (AIOS Inteligence)

**Documento de referência completa da WTS Chat API para uso no Lovable app AIOS Inteligence.**

Importante: o Lovable **não chama a WTS direto**. Toda chamada vai pela Edge Function `wts-action` no Supabase. Este doc existe para:
1. Lovable entender o domínio (o que cada campo significa)
2. Debug e troubleshooting
3. Manutenção futura (se um dia precisar mover lógica)

---

## 1. Conceitos básicos

### 1.1 Base URL
```
https://api.wts.chat
```

### 1.2 Autenticação
Header obrigatório em todas as requisições:
```
Authorization: <token>
accept: application/json
```

**SEM** prefixo `Bearer`. Token é por cliente, armazenado em `_secrets` (tabela Supabase, lookup por `client_handle + key='tokenwts'`).

### 1.3 Rate Limit
~1.5 req/s por instância (~500 calls/5min). Acima disso retorna `429 Too Many Requests`. Recomenda-se `Wait` de 700ms-1s entre chamadas sequenciais.

### 1.4 Paginação
Endpoints listáveis usam:
- `PageSize` (máx 100)
- `PageNumber` (começa em 1)

Response padrão para endpoints paginados:
```json
{
  "items": [...],
  "totalItems": 142,
  "totalPages": 2,
  "hasMorePages": true,
  "pageNumber": 1,
  "pageSize": 100
}
```

**Mas atenção:** alguns endpoints retornam array nu (sem envelope). Por exemplo `GET /core/v1/tag` retorna `[{...}, {...}]` direto.

### 1.5 Códigos de erro comuns

| Status | Significado | Causa típica |
|---|---|---|
| 401 | `ERROR_UNAUTHORIZED` "Acesso negado" | Token errado, prefixo Bearer indevido, ou header errado |
| 404 | Not found | ID inexistente ou cliente sem acesso ao recurso |
| 422 | Unprocessable | Body shape errado, campos obrigatórios faltando |
| 429 | Rate limit | Muitas requisições; aplicar backoff |
| 500 | Internal server error | Erro WTS-side; reportar |

---

## 2. Endpoints por categoria

### 2.1 Sessions (conversas)

#### Listar sessões
```
GET /chat/v2/session
```

Query params úteis:
- `UpdatedAt.After=<ISO date>` — filtra por atividade recente
- `PageSize=100`, `PageNumber=1`

⚠️ **Importante:** `LastInteractionDate.After` NÃO existe. Use `UpdatedAt.After`. Sort default é `createdAt DESC` (não dá pra ordenar por `lastInteractionDate`).

Cada item da resposta:
```json
{
  "id": "uuid-da-sessão",
  "type": "INDIVIDUAL",
  "status": "IN_PROGRESS",  // ou HIDDEN, FINISHED, etc
  "contactId": "uuid-do-contato",
  "channelId": "uuid",
  "departmentId": "uuid",
  "userId": "uuid-do-atendente-ou-null",
  "previewUrl": "https://app.aioscrm.com/redirect?type=SESSION&id=...",
  "title": "Nome da cliente",
  "number": "2026032800004",
  "utm": { "source": "INSTAGRAM", "campaign": "...", ... },
  "origin": "Empresa" | "Contato",
  "lastMessageText": "última mensagem...",
  "lastInteractionDate": "2026-05-10T20:35:42Z",
  "lastMessageOut": "2026-05-10T20:35:42Z",  // última msg da clínica
  "lastMessageIn": "2026-04-29T17:54:49Z",   // última msg da cliente
  "windowStatus": "ACTIVE",
  "tags": [...]
}
```

#### Buscar sessão específica
```
GET /chat/v2/session/{session_id}
```

Retorna mesmo formato do item da listagem, mas com mais detalhes opcionais.

#### Listar mensagens de uma sessão
```
GET /chat/v1/session/{session_id}/message?PageSize=20&OrderBy=createdAt:desc
```

Resposta envelopada `{items: [...]}`:
```json
{
  "items": [
    {
      "id": "uuid-msg",
      "createdAt": "2026-05-10T12:00:00Z",
      "text": "Conteúdo da mensagem",
      "body": null,
      "userId": "uuid-do-atendente-ou-null",
      "userName": "Thais",  // ou null se Bot
      "origin": "CAMPAIGN" | "OFFICE_HOURS" | "GATEWAY" | "MANUAL",
      "templateId": "uuid-ou-null",  // se template, é Bot
      "fromMe": true | false  // direção
    },
    ...
  ]
}
```

**Detecção de papel (Cliente / Atendente / Bot):**
- `origin IN (CAMPAIGN, OFFICE_HOURS)` OR `templateId` presente → **Bot**
- `userId` presente E não-Bot → **Atendente**
- Senão → **Cliente**

### 2.2 Mensagens (envio)

#### Enviar mensagem
```
POST /chat/v1/message/send
```

Body **exato** (validado no `agendamento-itupeva-v2.json` em produção):
```json
{
  "body": { "text": "Texto da mensagem aqui" },
  "to": "55<phone-digits>",
  "from": "5511913352918"
}
```

**Notas:**
- `to`: telefone com DDI 55 + dígitos (sem formatação). `(11) 91234-5678` → `5511912345678`.
- `from`: número WhatsApp Business da clínica. **Itupeva** = `5511913352918`.
- Texto vai dentro de `body.text` (objeto aninhado).

### 2.3 Contacts (contatos)

#### Buscar contato por telefone
```
GET /core/v1/contact/phonenumber/{phone}
```

Aceita telefone em qualquer formato (a API normaliza). Retorna:
```json
{
  "id": "uuid-do-contato",
  "name": "Maria",
  "phoneNumber": "+5511912345678",
  "email": "...",
  "tagIds": [...],
  "tagNames": [...],
  "customFields": {...}
}
```

#### Aplicar tag em contato (por telefone)
```
POST /core/v1/contact/phonenumber/{phone}/tags
```

Body:
```json
{
  "tagNames": ["NÃO RESPONDE"],
  "operation": "InsertIfNotExists"
}
```

Operations disponíveis:
- `InsertIfNotExists` — adiciona sem remover existentes (padrão)
- `DeleteIfExists` — remove as listadas
- `ReplaceAll` — substitui todas

⚠️ Use `operation` (top-level), NÃO `options.tagsOperation`. O `options.tagsOperation` é só para `PUT /core/v2/contact/{contact_id}`.

#### Listar todas as tags do workspace
```
GET /core/v1/tag?PageSize=200
```

Resposta é **array nu** (não envelopado):
```json
[
  { "id": "uuid", "name": "ACNE", "bgColor": "#...", "textColor": "#..." },
  ...
]
```

### 2.4 Panels (kanban)

#### Listar painéis
```
GET /crm/v1/panel?PageSize=50
```

Resposta envelopada. Cada painel:
```json
{
  "id": "uuid-painel",
  "title": "Painel Comercial - Gestor CRM",
  "scope": "COMPANY" | "USER",  // COMPANY = compartilhado, USER = pessoal (Minhas tarefas)
  "archived": false,
  "key": "PCGC",
  "steps": []  // VAZIO nesta listagem; usar endpoint de detalhe
}
```

⚠️ Campo é `title`, NÃO `name`. Filtrar painéis comerciais por `scope === "COMPANY"`.

#### Detalhe de um painel (com steps)
```
GET /crm/v1/panel/{panel_id}?IncludeDetails=Steps
```

Retorna o painel com `steps` populado:
```json
{
  "id": "uuid-painel",
  "title": "Painel Comercial - Gestor CRM",
  "steps": [
    { "id": "uuid-step-1", "name": "Em andamento", "order": 1 },
    { "id": "uuid-step-2", "name": "Concluído", "order": 2 },
    ...
  ]
}
```

### 2.5 Cards (itens do kanban)

#### Listar cards de um painel
```
GET /crm/v1/panel/card?PanelId={panel_id}&PageSize=100
```

Filtros úteis:
- `PanelId={uuid}` — obrigatório
- `StepId={uuid}` — filtrar por etapa
- `ContactId={uuid}` — buscar card de um contato específico

Cada card:
```json
{
  "id": "uuid-do-card",      // ← usar este para mover (NÃO o contactId)
  "contactId": "uuid-contato",
  "stepId": "uuid-step-atual",
  "panelId": "uuid-painel",
  "contact": {
    "name": "Maria",
    "phoneNumber": "+5511912345678",
    "tagNames": [...]
  }
}
```

#### Criar card
```
POST /crm/v1/panel/card
```

Body:
```json
{
  "panelId": "uuid-painel",
  "stepId": "uuid-step-inicial",
  "contactId": "uuid-contato"
}
```

#### Mover card (mudar de etapa)
```
PUT /crm/v2/panel/card/{card_id}
```

⚠️ Nota: endpoint usa **v2**, não v1.

Body:
```json
{
  "stepId": "uuid-step-destino"
}
```

---

## 3. IDs reais — Itupeva (fd-itupeva)

### 3.1 Painéis comerciais

| Nome | panel_id | Uso |
|---|---|---|
| Painel Comercial - Gestor CRM | `82b8ab1a-6945-4e63-a098-a7cf85a831cd` | **Principal** — usado pelo classificador padrão |
| Painel Comercial | `7fa14a2b-f8ad-4cd3-9bc7-1c9695330abf` | Alternativo |
| Consultora Comercial - PipeLine | `8db060c6-3742-43aa-b904-9037d1d0765b` | PipeLine das consultoras |

Outros 6 painéis "Minhas tarefas" são pessoais (scope=USER) e devem ser ignorados.

### 3.2 Steps por painel

Mapping completo está em `wts_panel_mapping` (Supabase) com `composite_key = '<panel title> > <step name>'`.

Consulta:
```sql
SELECT composite_key, panel_id, step_id
FROM wts_panel_mapping
WHERE client_handle = 'itupeva';
```

Steps principais por painel:
- **Painel Comercial - Gestor CRM**: 8 steps (operacional)
- **Consultora Comercial - PipeLine**: 14 steps (negociação completa, "Agendar avaliação" → "Concluído")
- **Painel Comercial**: 2 steps (simplificado)

### 3.3 WhatsApp number (`from` field)
```
5511913352918
```

### 3.4 Tags comuns (catálogo)

Catálogo completo em `clientes/fd-itupeva/followup-catalogos/tags_itupeva.txt` (~80 tags). Exemplos relevantes:
- `NÃO RESPONDE` — lead frio
- `AGENDOU AVALIAÇÃO`
- `Bioestimulador`, `Botox`, `Laser`, etc — procedimentos
- `Cobrança Pagamento` — pendência financeira
- `Concluído` — negócio fechado

### 3.5 Atendentes humanas
- **Thais**
- **Victoria**
- **Cassia** (atendente nova, abr/2026)

Demais nomes em mensagens = Bot/template.

---

## 4. Fluxos completos

### 4.1 Aplicar tag em contato (por telefone)

```
Input: phone, tag_name
─────────────────────────────────────
POST /core/v1/contact/phonenumber/{phone}/tags
  body: { tagNames: [tag_name], operation: "InsertIfNotExists" }
─────────────────────────────────────
Response 200 OK → contato atualizado
Response 401     → token errado
Response 404     → contato não existe
```

### 4.2 Mover card no kanban (cliente já tem card)

```
Input: phone, target_panel_id, target_step_id
──────────────────────────────────────────────
1. GET /core/v1/contact/phonenumber/{phone}
   → contact_id
2. GET /crm/v1/panel/card?PanelId={panel_id}&ContactId={contact_id}
   → card[0].id (card_id)
3. PUT /crm/v2/panel/card/{card_id}
   body: { stepId: target_step_id }
──────────────────────────────────────────────
3 chamadas. Total ~2-3s.
```

### 4.3 Criar card (cliente sem card no painel)

```
Input: phone, target_panel_id, target_step_id
──────────────────────────────────────────────
1. GET /core/v1/contact/phonenumber/{phone}
   → contact_id
2. GET /crm/v1/panel/card?PanelId={panel_id}&ContactId={contact_id}
   → array vazio → cliente não tem card neste painel
3. POST /crm/v1/panel/card
   body: { panelId, stepId, contactId }
   → novo card criado
──────────────────────────────────────────────
3 chamadas.
```

### 4.4 Enviar mensagem WhatsApp

```
Input: phone, message_text
──────────────────────────────────────────
POST /chat/v1/message/send
  body: {
    body: { text: message_text },
    to: "55" + phone_digits_only,
    from: "5511913352918"   // Itupeva
  }
──────────────────────────────────────────
Response 200 → enviada (entregue assíncronamente)
Response 401 → token
Response 422 → body shape errado
Response 429 → rate limit
```

### 4.5 Fluxo "Aprovar tudo" (apply_all do Edge Function)

```
Input: log_id, opcional message_override, actioned_by
─────────────────────────────────────────────────────
1. Edge Function lê log → tag, column, message, customer_phone
2. Edge Function lê _secrets → tokenwts
3. Edge Function lê wts_panel_mapping → panel_id, step_id pela column
4. POST tag                              → 1 call
5. GET contact → contact_id              → 1 call
6. GET cards (PanelId, ContactId)        → 1 call
7. SE existe card[0]:
     PUT v2/panel/card/{id}  (move)     → 1 call
   SENÃO:
     POST /crm/v1/panel/card (cria)     → 1 call
8. POST message/send                     → 1 call
9. UPDATE log → action_status, timestamps, errors
─────────────────────────────────────────────────────
Total: 5 chamadas WTS + 2 chamadas Supabase. Tempo ~4-6s.
```

---

## 5. Validações de mensagem (regras do AIOS)

Antes de enviar uma mensagem (`POST /chat/v1/message/send`), validar:

- ✅ Comprimento entre **40 e 600 caracteres**
- ❌ NÃO conter `—` (travessão é tell de IA — substituir por `, ` ou `(` ou `.`)
- ❌ NÃO conter palavras de tom comercial agressivo: `aproveite`, `última chance`, `desconto especial`
- ✅ Tom humano (Thais/Victoria), chamando pelo primeiro nome se disponível
- ✅ Máx 1 emoji
- ✅ Terminar com pergunta aberta (preferível)

Mensagens que violam essas regras devem ser:
- Bloqueadas no client (UI mostra warning, desabilita botão Aprovar)
- Ou demovidas para `action_type='tag_only'` automaticamente

---

## 6. Troubleshooting

### Token está errado
```
401 ERROR_UNAUTHORIZED "Acesso negado"
```
- Verificar header `Authorization` (sem Bearer)
- Verificar valor do token em `_secrets` (não pode ter espaços, aspas, ou prefixo)

### Telefone não encontrado
```
404 contact_not_found
```
- Telefone pode estar em formato diferente (com/sem 9, com/sem 55, com/sem +)
- A API tolera diferentes formatos no `{phone}` da URL, mas se mesmo assim 404, o contato não existe — criar primeiro via `POST /core/v1/contact`

### Card não encontrado para sessão
```
GET /crm/v1/panel/card?PanelId&ContactId → []
```
- Cliente nunca foi colocado em card deste painel
- Solução: `POST /crm/v1/panel/card` para criar (ver fluxo 4.3)

### Rate limit
```
429 Too Many Requests
```
- Backoff 30s e tentar novamente
- Aplicar token bucket de 1.5 req/s para chamadas sequenciais
- Edge Function `wts-action` já implementa retry com backoff exponencial

### PUT move card retorna sucesso mas card não muda na UI
- Verificar se `stepId` realmente pertence ao mesmo painel do card
- Cache da UI WTS pode demorar uns segundos (não é bug nosso)

---

## 7. Referências internas

- `conhecimento/wts-api/wts-api.md` — visão geral e endpoints
- `conhecimento/wts-api/wts-gets.md` — GETs detalhados
- `conhecimento/wts-api/wts-updates.md` — POSTs/PUTs (tags, cards, sequências)
- `clientes/fd-itupeva/n8n/agendamento-itupeva-v2.json` — workflow em produção que usa `POST /chat/v1/message/send`
- `clientes/fd-itupeva/supabase/functions/wts-action/index.ts` — Edge Function que implementa os fluxos
- `clientes/fd-itupeva/followup-catalogos/tags_itupeva.txt` — catálogo completo de tags
- `clientes/fd-itupeva/followup-catalogos/colunas_itupeva.txt` — catálogo completo de colunas (formato `<painel> > <step>`)
