import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WTS_RATE_LIMIT_MS, BULK_CONCURRENCY } from '@/lib/constants';
import { sleep } from '@/lib/utils';
import {
  wtsApplyTag,
  wtsCreateCard,
  wtsGetCards,
  wtsGetContact,
  wtsMoveCard,
  wtsSendMessage,
} from '@/lib/wts';
import { getOperatorOnce } from './use-operator';
import type {
  CardAction,
  PanelMappingRow,
  SuggestionRow,
  WtsErrorEntry,
  WtsResult,
} from '@/lib/types';

type ApproveInput = {
  row: SuggestionRow;
  override?: string | null;
  mapping?: Map<string, PanelMappingRow>;
};

export type ApproveOutcome = {
  rowId: number;
  status: 'executed' | 'failed';
  errors: Record<string, WtsErrorEntry>;
};

function toEntry(r: WtsResult): WtsErrorEntry {
  if (r.ok) return { ok: true };
  return { ok: false, status: r.status, error: r.error };
}

export async function approveOne({ row, override, mapping }: ApproveInput): Promise<ApproveOutcome> {
  const errors: Record<string, WtsErrorEntry> = {};
  const ts = () => new Date().toISOString();
  const updates: Record<string, unknown> = {
    actioned_by: getOperatorOnce(),
    actioned_at: ts(),
    human_message_override: override ?? null,
  };

  // 1) Apply tag
  if (row.tag_applied && row.customer_phone) {
    const res = await wtsApplyTag(row.customer_phone, row.tag_applied);
    errors.apply_tag = toEntry(res);
    if (res.ok) updates.wts_tag_applied_at = ts();
    await sleep(WTS_RATE_LIMIT_MS);
  }

  // 2-4) Card
  if (row.column_applied && row.customer_phone) {
    const map = mapping?.get(row.column_applied);
    if (!map) {
      errors.card = { ok: false, status: 0, error: `composite_key_not_found:${row.column_applied}` };
      updates.card_action = 'failed' satisfies CardAction;
    } else {
      const contactRes = await wtsGetContact(row.customer_phone);
      await sleep(WTS_RATE_LIMIT_MS);
      if (!contactRes.ok) {
        errors.card = toEntry(contactRes);
        updates.card_action = 'failed' satisfies CardAction;
      } else {
        const contactId = contactRes.data.id;
        const cardsRes = await wtsGetCards(map.panel_id, contactId);
        await sleep(WTS_RATE_LIMIT_MS);
        if (!cardsRes.ok) {
          errors.card = toEntry(cardsRes);
          updates.card_action = 'failed' satisfies CardAction;
        } else if (cardsRes.data.length > 0) {
          const cardId = cardsRes.data[0]!.id;
          const moveRes = await wtsMoveCard(cardId, map.step_id);
          errors.card = toEntry(moveRes);
          if (moveRes.ok) {
            updates.wts_card_moved_at = ts();
            updates.card_action = 'moved' satisfies CardAction;
            updates.card_id_used = cardId;
          } else {
            updates.card_action = 'failed' satisfies CardAction;
          }
          await sleep(WTS_RATE_LIMIT_MS);
        } else {
          const createRes = await wtsCreateCard(map.panel_id, map.step_id, contactId);
          errors.card = toEntry(createRes);
          if (createRes.ok) {
            updates.wts_card_moved_at = ts();
            updates.card_action = 'created' satisfies CardAction;
            updates.card_id_used = createRes.data.id;
          } else {
            updates.card_action = 'failed' satisfies CardAction;
          }
          await sleep(WTS_RATE_LIMIT_MS);
        }
      }
    }
  }

  // 5) Send message
  if (row.suggest_message) {
    const text = (override ?? row.message_sent ?? '').trim();
    if (!text) {
      errors.send_message = { ok: false, status: 0, error: 'empty_message' };
    } else if (!row.customer_phone) {
      errors.send_message = { ok: false, status: 0, error: 'no_phone' };
    } else {
      const res = await wtsSendMessage(row.customer_phone, text);
      errors.send_message = toEntry(res);
      if (res.ok) updates.wts_message_sent_at = ts();
    }
  }

  const requested = Object.keys(errors);
  const anyOk = requested.length > 0 && requested.some((k) => errors[k]!.ok);
  const allOk = requested.length > 0 && requested.every((k) => errors[k]!.ok);
  const status: 'executed' | 'failed' = allOk || anyOk ? 'executed' : 'failed';

  updates.action_status = status;
  updates.wts_errors = errors;

  const { error: updErr } = await supabase
    .from('wts_auto_followup_log')
    .update(updates)
    .eq('id', row.id);
  if (updErr) {
    return {
      rowId: row.id,
      status: 'failed',
      errors: { supabase_update: { ok: false, status: 0, error: updErr.message } },
    };
  }

  return { rowId: row.id, status, errors };
}

export function useApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveOne,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      rows: SuggestionRow[];
      mapping?: Map<string, PanelMappingRow>;
      onProgress?: (done: number, total: number) => void;
    }) => {
      const { rows, mapping, onProgress } = args;
      const outcomes: ApproveOutcome[] = [];
      let done = 0;
      for (let i = 0; i < rows.length; i += BULK_CONCURRENCY) {
        const chunk = rows.slice(i, i + BULK_CONCURRENCY);
        const results = await Promise.allSettled(
          chunk.map((row) => approveOne({ row, mapping })),
        );
        for (const r of results) {
          if (r.status === 'fulfilled') outcomes.push(r.value);
          else {
            outcomes.push({
              rowId: -1,
              status: 'failed',
              errors: { unknown: { ok: false, status: 0, error: String(r.reason) } },
            });
          }
          done += 1;
          onProgress?.(done, rows.length);
        }
      }
      return outcomes;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
