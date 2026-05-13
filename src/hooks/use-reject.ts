import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getOperatorOnce } from './use-operator';
import type { SuggestionRow } from '@/lib/types';

export function useReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: SuggestionRow | SuggestionRow[]) => {
      const ids = (Array.isArray(rows) ? rows : [rows]).map((r) => r.id);
      const { error } = await supabase
        .from('wts_auto_followup_log')
        .update({
          action_status: 'rejected',
          actioned_by: getOperatorOnce(),
          actioned_at: new Date().toISOString(),
        })
        .in('id', ids);
      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] });
      qc.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
