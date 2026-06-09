# Design — Filtro de Responsável no Inbox

**Data:** 2026-06-09
**Cliente:** Life Plans (`client_handle = life-plans`)
**Autor:** brainstorming com stakeholder

## Problema

Cada funcionário (atendente) precisa conseguir ver e aprovar as sugestões da IA
**somente dos clientes dele**. Hoje o inbox (`/`) mostra todas as sugestões
`pending` de todos os atendentes misturadas, sem nenhuma forma de filtrar por
quem é o responsável pelo cliente.

## Decisões de produto (definidas no brainstorming)

1. **Modelo de acesso: filtro simples por dropdown.** Não há login/autenticação
   no app (inbox aberto por link, RLS desligada). O filtro é por conveniência,
   **não** é barreira de segurança — qualquer um pode trocar o nome no dropdown.
   Login de verdade ficou explicitamente fora de escopo.
2. **Lista de nomes: automática, escondendo gerência/bot/ex-funcionários.** A
   lista é montada a partir dos responsáveis presentes nos próprios dados,
   filtrando fora gerência (Patricia), bot/sistema e ex-funcionárias.
3. **Padrão "Todos" + bucket "Sem responsável".** Ao abrir, mostra tudo (visão
   de gerente). Sugestões sem responsável definido vão para uma opção
   "Sem responsável" para nenhum lead se perder.

## Realidade dos dados (verificado em produção, 2026-06-09)

Distribuição de `responsible_user_id` / `responsible_user_name` nas sugestões
**pending** de `life-plans`:

| Responsável        | `responsible_user_id`                  | Pendentes |
|--------------------|----------------------------------------|-----------|
| Claudia Rodrigues  | `7a2cf6ae-82b5-4bad-9cec-d0fd992d4318` | 81        |
| Andre Luiz         | `f6f4d635-d9ab-47e0-96fa-2c0a041770b9` | 78        |
| Thays              | `e22b9c9c-5806-463f-a5fe-10362282e4f8` | 36        |
| (sem responsável)  | `null`                                 | 1         |
| (sem nome)         | `fc9eb8e1-35df-4ecc-81fd-7e330066c4a5` | 1         |
| (sem nome)         | `6cc0f7a6-4a32-433b-9c8e-46a84fced129` | 1         |

**Achado crítico:** o campo `responsible_user_name` está **nulo** para a Thays
(`e22b9c9c`) e para os dois ids de cauda — o scanner gravou o `id` mas não o
nome. O `raw_session_meta` desses registros também não traz o nome
(`userId`/`userName`/`responsibleUserName` vêm nulos). Portanto **não dá para
montar o dropdown só pelos nomes** — isso esconderia a Thays e suas 36 sugestões.

**Conclusão de design:** agrupar e filtrar por `responsible_user_id`, resolvendo
o nome de exibição via um mapa `id → nome` mantido no frontend.

### Pessoas conhecidas (de `client_vars_life_plans.md` §6 + confirmação do stakeholder)

| id                                     | Nome              | No dropdown? | Notas |
|----------------------------------------|-------------------|--------------|-------|
| `f6f4d635-d9ab-47e0-96fa-2c0a041770b9` | Andre Luiz        | ✅ mostrar   | nome também vem no banco |
| `7a2cf6ae-82b5-4bad-9cec-d0fd992d4318` | Claudia Rodrigues | ✅ mostrar   | nome também vem no banco |
| `e22b9c9c-5806-463f-a5fe-10362282e4f8` | Thays             | ✅ mostrar   | nome **só** via mapa (banco nulo) |
| (uid a capturar)                       | Aliny             | ✅ mostrar   | funcionária nova; ainda sem linhas/uid conhecido. Plugar uid+nome no mapa quando aparecer |
| (uid a confirmar)                      | Patricia          | ❌ esconder  | gerência, não atende clientes |
| `26152132-b1d4-4318-b52f-e726188c5a3f` | Roberta Martins   | ❌ esconder  | saiu |
| `10b6634a-c3dc-4083-af23-f36ff009b887` | Solange Silva     | ❌ esconder  | saiu |
| `00000000-0000-0000-0000-000000000000` | (bot/sistema)     | ❌ esconder  | |

## Comportamento (UX)

- Novo dropdown **"Responsável"** no topo do inbox (`/`), posicionado junto das
  abas de tipo existentes (`FilterTabs`: Todas / Com mensagem / Só tag/coluna /
  Lead frio). Usa o mesmo componente `Select` (shadcn) já usado no dropdown
  "Operador" da tela de Histórico (`src/routes/historico.tsx`).
- Opções, nesta ordem:
  1. **"Todos"** (valor padrão ao abrir)
  2. um item por atendente **ativo** presente nas sugestões pending (ex.: Andre
     Luiz, Claudia Rodrigues, Thays), com a contagem ao lado — ex.: `Claudia (81)`
  3. **"Sem responsável"** (registros com `responsible_user_id` nulo)
- Selecionar um responsável filtra a tabela para mostrar só os clientes dele.
- O filtro de responsável **combina** (AND) com as abas de tipo já existentes:
  os dois aplicam juntos sobre o mesmo conjunto de linhas.
- O contador "{visíveis} de {total}" no header reflete o resultado combinado.

## Regra da lista (resolução de nome + ocultação)

Construída dinamicamente a partir dos `responsible_user_id` distintos presentes
nas linhas carregadas (pending), aplicando:

1. **Ocultar** ids na lista de ocultos (gerência/bot/ex — ver tabela acima).
   Linhas desses responsáveis **não aparecem** em "Todos" nem geram item próprio.
   - _Pendência:_ confirmar o uid da Patricia para incluí-lo nos ocultos. Até lá
     ela não aparece nos dados pending atuais, então não há vazamento hoje.
2. **Resolver nome de exibição** por precedência:
   - se o id está no mapa `id → nome` (constants) → usa o nome do mapa;
   - senão, se a linha tem `responsible_user_name` não-nulo → usa o do banco;
   - senão → rótulo `"Sem nome"` (mantém o item visível para não sumir leads de
     um responsável ainda não mapeado).
3. **"Sem responsável"**: bucket fixo para `responsible_user_id === null`.

> Os dois ids de cauda (`fc9eb8e1…`, `6cc0f7a6…`, 1 pendente cada) não estão no
> mapa nem nos ocultos → aparecem como "Sem nome" até serem identificados. Aliny
> cairá nesse caso quando começar a receber clientes; basta adicionar o uid+nome
> dela ao mapa.

## Arquitetura / implementação

Segue o padrão **client-side** já usado pelos `FilterTabs` — sem mexer na query
Supabase nem no scanner n8n.

### Arquivos tocados

1. **`src/lib/types.ts`** — adicionar ao tipo `SuggestionRow`:
   ```ts
   responsible_user_id: string | null;
   responsible_user_name: string | null;
   ```
   (já vêm no `select('*')` de `useSuggestions`; só não estavam tipados.)

2. **`src/lib/constants.ts`** — novo mapa de responsáveis:
   ```ts
   // id WTS → nome de exibição (atendentes ativos)
   export const RESPONSIBLE_NAMES: Record<string, string> = {
     'f6f4d635-d9ab-47e0-96fa-2c0a041770b9': 'Andre Luiz',
     '7a2cf6ae-82b5-4bad-9cec-d0fd992d4318': 'Claudia Rodrigues',
     'e22b9c9c-5806-463f-a5fe-10362282e4f8': 'Thays',
     // 'uid-da-aliny': 'Aliny',  // plugar quando o scanner capturar
   };

   // ids que NUNCA entram no dropdown (gerência / bot / ex-funcionários)
   export const HIDDEN_RESPONSIBLE_IDS = new Set<string>([
     '26152132-b1d4-4318-b52f-e726188c5a3f', // Roberta (saiu)
     '10b6634a-c3dc-4083-af23-f36ff009b887', // Solange (saiu)
     '00000000-0000-0000-0000-000000000000', // bot/sistema
     // '<uid-patricia>',                     // gerência — confirmar uid
   ]);
   ```

3. **Helper de derivação** (ex.: `src/lib/responsibles.ts`, ou colocado em
   `index.tsx` se ficar pequeno) — função pura, testável:
   - `resolveResponsibleName(row): string` → aplica a precedência mapa → banco → "Sem nome".
   - `buildResponsibleOptions(rows): { id: string | 'all' | 'none'; label: string; count: number }[]`
     → distintos dos `rows`, remove ocultos, conta por id, ordena
     **alfabeticamente pelo nome de exibição** (previsível para cada um achar o
     próprio nome), prepend "Todos" e append "Sem responsável".

4. **Novo componente `src/components/layout/responsible-filter.tsx`** — encapsula
   o `Select`. Props: `value`, `onChange`, `options`. Mantém o inbox enxuto e a
   peça testável isoladamente.

5. **`src/routes/index.tsx`**:
   - `const [responsible, setResponsible] = useState<string>('all')` (valores:
     `'all'` | `'none'` | `<responsible_user_id>`).
   - `const responsibleOptions = useMemo(() => buildResponsibleOptions(rows), [rows])`.
   - estender o `useMemo` de `filtered` para aplicar **também** o filtro de
     responsável (AND com o filtro de tipo):
     - `'all'` → sem restrição;
     - `'none'` → `row.responsible_user_id === null`;
     - `<id>` → `row.responsible_user_id === id`;
     - em todos os casos, **excluir** linhas cujo id esteja em
       `HIDDEN_RESPONSIBLE_IDS` quando em `'all'` (para a gerência/bot não
       poluírem a visão geral).
   - renderizar `<ResponsibleFilter />` ao lado de `<FilterTabs />`.

### Estado e persistência

- Estado React local (`useState`), igual ao filtro de tipo. **Sem** persistência
  em localStorage (decisão: padrão sempre "Todos" ao abrir).
- O dropdown "Operador" (que grava `actioned_by`) **não** é alterado por este
  trabalho.

## Testes

- **Unitários (função pura)** para `buildResponsibleOptions` e
  `resolveResponsibleName`:
  - agrupa por id e conta certo;
  - resolve nome via mapa quando o banco está nulo (caso Thays);
  - cai em "Sem nome" para id desconhecido;
  - remove ids ocultos da lista;
  - "Sem responsável" agrupa `null`;
  - ordem das opções (Todos primeiro, Sem responsável por último).
- **Manual/dogfood** no inbox: selecionar cada responsável e conferir que a
  contagem visível bate com os números da tabela de dados acima; conferir que
  o filtro de tipo combina corretamente.

## Fora de escopo (YAGNI)

- Login/autenticação ou qualquer barreira de segurança real.
- Reatribuir o responsável de um cliente pela UI.
- Alterar o scanner n8n para capturar o nome da Thays/Aliny (mitigado pelo mapa
  no frontend).
- Filtro de responsável na tela de Histórico (este trabalho é só o inbox).
- Trocar os nomes hardcoded "Murilo/Lucas" do seletor Operador (resíduo de
  template; fora do escopo, anotado como dívida).

## Pendências pós-implementação (config, não-bloqueantes)

- [ ] Confirmar o `uid` da **Patricia** e adicioná-lo a `HIDDEN_RESPONSIBLE_IDS`.
- [ ] Capturar o `uid` da **Aliny** e adicioná-la a `RESPONSIBLE_NAMES`.
- [ ] Identificar os ids de cauda `fc9eb8e1…` e `6cc0f7a6…` (1 pendente cada).
