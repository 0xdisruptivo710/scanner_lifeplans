import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WTS_RATE_LIMIT_MS, BULK_CONCURRENCY } from '@/lib/constants';
import { sleep } from '@/lib/utils';
import {
  wtsApplyTagById,
  wtsCreateCard,
  wtsGetCards,
  wtsGetContactById,
  wtsGetContactByPhone,
  wtsMoveCard,
  wtsSendMessage,
} from '@/lib/wts';
import { getOperatorOnce } from './use-operator';
import { resolveTagId, type TagsCatalog } from './use-tags-catalog';
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
  tagsCatalog?: TagsCatalog;
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

async function ensurePhoneAndContactId(
  row: SuggestionRow,
  errors: Record<string, WtsErrorEntry>,
  updates: Record<string, unknown>,
): Promise<{ phone: string | null; contactId: string | null }> {
  let phone = row.customer_phone;
  let contactId = row.contact_id;

  // Caso comum (novo schema): tudo já vem do N8N
  if (phone && contactId) return { phone, contactId };

  // Fallback A: temos phone, falta contactId
  if (phone && !contactId) {
    const res = await wtsGetContactByPhone(phone);
    errors.resolve_contact = toEntry(res);
    await sleep(WTS_RATE_LIMIT_MS);
    if (res.ok) {
      contactId = res.data.id;
      updates.contact_id = contactId;
    }
    return { phone, contactId };
  }

  // Fallback B: temos contactId, falta phone
  if (!phone && contactId) {
    const res = await wtsGetContactById(contactId);
    errors.resolve_contact = toEntry(res);
    await sleep(WTS_RATE_LIMIT_MS);
    if (res.ok && res.data.phoneNumber) {
      phone = res.data.phoneNumber;
      updates.customer_phone = phone;
      if (res.data.name && !row.customer_name) updates.customer_name = res.data.name;
    }
    return { phone, contactId };
  }

  // Caso de borda: sem phone nem contactId. Não tem o que fazer aqui — N8N precisa popular.
  errors.resolve_contact = {
    ok: false,
    status: 0,
    error: 'no_phone_no_contact_id_on_row',
  };
  return { phone: null, contactId: null };
}

export async function approveOne({
  row,
  override,
  mapping,
  tagsCatalog,
}: ApproveInput): Promise<ApproveOutcome> {
  const errors: Record<string, WtsErrorEntry> = {};
  const ts = () => new Date().toISOString();
  const updates: Record<string, unknown> = {
    actioned_by: getOperatorOnce(),
    actioned_at: ts(),
    human_message_override: override ?? null,
  };

  const { phone, contactId } = await ensurePhoneAndContactId(row, errors, updates);

  // 1) Aplicar tag (por UUID — tagIds)
  if (row.tag_applied || row.suggested_tag_id) {
    const tagId = resolveTagId(tagsCatalog, row.suggested_tag_id, row.tag_applied);
    if (!tagId) {
      errors.apply_tag = {
        ok: false,
        status: 0,
        error: `tag_id_not_found_for:${row.tag_applied ?? '(no name)'}`,
      };
    } else if (!phone) {
      errors.apply_tag = { ok: false, status: 0, error: 'no_phone' };
    } else {
      const res = await wtsApplyTagById(phone, tagId);
      errors.apply_tag = toEntry(res);
      if (res.ok) updates.wts_tag_applied_at = ts();
      await sleep(WTS_RATE_LIMIT_MS);
    }
  }

  // 2) Card: move se existe, cria se não existe
  if (row.column_applied || row.suggested_step_id) {
    // Step destino: prioriza suggested_step_id; senão resolve via mapping
    let targetStepId: string | null = row.suggested_step_id;
    let targetPanelId: string | null = null;

    if (row.column_applied) {
      const map = mapping?.get(row.column_applied);
      if (map) {
        targetPanelId = map.panel_id;
        if (!targetStepId) targetStepId = map.step_id;
      }
    }

    if (!targetStepId) {
      errors.card = {
        ok: false,
        status: 0,
        error: `step_id_not_found_for:${row.column_applied ?? '(no column)'}`,
      };
      updates.card_action = 'none' satisfies CardAction;
    } else if (!contactId) {
      errors.card = { ok: false, status: 0, error: 'no_contact_id' };
      updates.card_action = 'none' satisfies CardAction;
    } else if (!targetPanelId) {
      // Sem panel_id não dá pra buscar card existente — direto cria
      const createRes = await wtsCreateCard({
        stepId: targetStepId,
        title: row.customer_name ?? 'Cliente',
        contactId,
        sessionId: row.session_id,
      });
      errors.card = toEntry(createRes);
      if (createRes.ok) {
        updates.wts_card_moved_at = ts();
        updates.card_action = 'create' satisfies CardAction;
        updates.card_id_used = createRes.data.id;
      } else {
        updates.card_action = 'none' satisfies CardAction;
      }
      await sleep(WTS_RATE_LIMIT_MS);
    } else {
      const cardsRes = await wtsGetCards(targetPanelId, contactId);
      await sleep(WTS_RATE_LIMIT_MS);
      if (!cardsRes.ok) {
        errors.card = toEntry(cardsRes);
        updates.card_action = 'none' satisfies CardAction;
      } else if (cardsRes.data.length > 0) {
        const cardId = cardsRes.data[0]!.id;
        const moveRes = await wtsMoveCard(cardId, targetStepId);
        errors.card = toEntry(moveRes);
        if (moveRes.ok) {
          updates.wts_card_moved_at = ts();
          updates.card_action = 'move' satisfies CardAction;
          updates.card_id_used = cardId;
        } else {
          updates.card_action = 'none' satisfies CardAction;
        }
        await sleep(WTS_RATE_LIMIT_MS);
      } else {
        const createRes = await wtsCreateCard({
          stepId: targetStepId,
          title: row.customer_name ?? 'Cliente',
          contactId,
          sessionId: row.session_id,
        });
        errors.card = toEntry(createRes);
        if (createRes.ok) {
          updates.wts_card_moved_at = ts();
          updates.card_action = 'create' satisfies CardAction;
          updates.card_id_used = createRes.data.id;
        } else {
          updates.card_action = 'none' satisfies CardAction;
        }
        await sleep(WTS_RATE_LIMIT_MS);
      }
    }
  }

  // 3) Enviar mensagem
  if (row.suggest_message) {
    const text = (override ?? row.message_sent ?? '').trim();
    if (!text) {
      errors.send_message = { ok: false, status: 0, error: 'empty_message' };
    } else if (!phone) {
      errors.send_message = { ok: false, status: 0, error: 'no_phone' };
    } else {
      const res = await wtsSendMessage(phone, text);
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
      tagsCatalog?: TagsCatalog;
      onProgress?: (done: number, total: number) => void;
    }) => {
      const { rows, mapping, tagsCatalog, onProgress } = args;
      const outcomes: ApproveOutcome[] = [];
      let done = 0;
      for (let i = 0; i < rows.length; i += BULK_CONCURRENCY) {
        const chunk = rows.slice(i, i + BULK_CONCURRENCY);
        const results = await Promise.allSettled(
          chunk.map((row) => approveOne({ row, mapping, tagsCatalog })),
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
