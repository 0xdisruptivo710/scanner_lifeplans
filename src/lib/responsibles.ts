import { RESPONSIBLE_NAMES, HIDDEN_RESPONSIBLE_IDS } from '@/lib/constants';
import type { SuggestionRow } from '@/lib/types';

// Valores especiais do filtro (além de um responsible_user_id).
export const RESP_ALL = 'all';
export const RESP_NONE = 'none';

/** Valor selecionado no filtro: 'all' | 'none' | <responsible_user_id>. */
export type ResponsibleValue = string;

export type ResponsibleOption = {
  value: ResponsibleValue;
  label: string;
  count: number;
};

/**
 * Nome de exibição do responsável de uma linha, por precedência:
 * mapa de uids → nome gravado pelo scanner → "Sem nome".
 */
export function resolveResponsibleName(
  row: Pick<SuggestionRow, 'responsible_user_id' | 'responsible_user_name'>,
): string {
  const id = row.responsible_user_id;
  if (id && RESPONSIBLE_NAMES[id]) return RESPONSIBLE_NAMES[id];
  if (row.responsible_user_name) return row.responsible_user_name;
  return 'Sem nome';
}

/**
 * Decide se uma linha entra na visão atual do filtro de responsável.
 * Em "Todos", esconde gerência/bot/ex (HIDDEN_RESPONSIBLE_IDS).
 */
export function matchesResponsible(row: SuggestionRow, value: ResponsibleValue): boolean {
  const id = row.responsible_user_id;
  if (value === RESP_ALL) return id === null || !HIDDEN_RESPONSIBLE_IDS.has(id);
  if (value === RESP_NONE) return id === null;
  return id === value;
}

/**
 * Monta as opções do dropdown a partir das linhas carregadas: "Todos" primeiro,
 * um item por atendente ativo (alfabético), e "Sem responsável" por último.
 * Responsáveis ocultos não viram item nem contam em "Todos".
 */
export function buildResponsibleOptions(rows: SuggestionRow[]): ResponsibleOption[] {
  const byId = new Map<string, { label: string; count: number }>();
  let noneCount = 0;
  let visibleTotal = 0;

  for (const row of rows) {
    const id = row.responsible_user_id;
    if (id === null) {
      noneCount += 1;
      visibleTotal += 1;
      continue;
    }
    if (HIDDEN_RESPONSIBLE_IDS.has(id)) continue;
    visibleTotal += 1;
    const existing = byId.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      byId.set(id, { label: resolveResponsibleName(row), count: 1 });
    }
  }

  const people = Array.from(byId.entries())
    .map(([value, { label, count }]) => ({ value, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  const options: ResponsibleOption[] = [
    { value: RESP_ALL, label: 'Todos', count: visibleTotal },
    ...people,
  ];
  if (noneCount > 0) {
    options.push({ value: RESP_NONE, label: 'Sem responsável', count: noneCount });
  }
  return options;
}
