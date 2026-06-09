import { RESPONSIBLE_NAMES, HIDDEN_RESPONSIBLE_IDS } from '@/lib/constants';
import type { SuggestionRow } from '@/lib/types';

// Valores especiais do filtro (além de um responsible_user_id concreto).
export const RESP_ALL = 'all';
export const RESP_NONE = 'none';

/** Valor selecionado no filtro: 'all' | 'none' | <responsible_user_id>. */
export type ResponsibleValue = string;

export type ResponsibleOption = {
  value: ResponsibleValue;
  label: string;
  count: number;
};

type RespRow = Pick<SuggestionRow, 'responsible_user_id' | 'responsible_user_name'>;

/**
 * Nome resolvido do responsável por precedência: mapa de uids → nome gravado
 * pelo scanner. Retorna null quando não há nome em nenhuma das fontes.
 */
export function resolveResponsibleName(row: RespRow): string | null {
  const id = row.responsible_user_id;
  if (id && RESPONSIBLE_NAMES[id]) return RESPONSIBLE_NAMES[id];
  if (row.responsible_user_name) return row.responsible_user_name;
  return null;
}

function isHidden(id: string | null): boolean {
  return id !== null && HIDDEN_RESPONSIBLE_IDS.has(id);
}

/**
 * Linha sem dono identificável: sem id, ou id (não-oculto) sem nome resolvível.
 * Tudo isso é agrupado num único bucket "Sem responsável".
 */
function isUnassigned(row: SuggestionRow): boolean {
  if (isHidden(row.responsible_user_id)) return false; // ocultos não contam aqui
  return resolveResponsibleName(row) === null;
}

/**
 * Decide se uma linha entra na visão atual do filtro de responsável.
 * Em "Todos", esconde gerência/bot/ex (HIDDEN_RESPONSIBLE_IDS).
 */
export function matchesResponsible(row: SuggestionRow, value: ResponsibleValue): boolean {
  if (value === RESP_ALL) return !isHidden(row.responsible_user_id);
  if (value === RESP_NONE) return isUnassigned(row);
  return row.responsible_user_id === value;
}

/**
 * Monta as opções do dropdown a partir das linhas carregadas: "Todos" primeiro,
 * um item por atendente nomeado (alfabético), e um único "Sem responsável" por
 * último agrupando tudo que não tem dono identificável. Ocultos não entram.
 */
export function buildResponsibleOptions(rows: SuggestionRow[]): ResponsibleOption[] {
  const byId = new Map<string, { label: string; count: number }>();
  let noneCount = 0;
  let visibleTotal = 0;

  for (const row of rows) {
    if (isHidden(row.responsible_user_id)) continue;
    visibleTotal += 1;

    const id = row.responsible_user_id;
    const name = id === null ? null : resolveResponsibleName(row);
    if (id !== null && name !== null) {
      const existing = byId.get(id);
      if (existing) existing.count += 1;
      else byId.set(id, { label: name, count: 1 });
    } else {
      noneCount += 1;
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
