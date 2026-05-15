import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CLIENT_HANDLE, TABLE_AUTO_FOLLOWUP_LOG } from '@/lib/constants';
import type { ActionStatus, SuggestionRow } from '@/lib/types';

export type HistoryFilters = {
  sinceIso?: string;
  status?: ActionStatus | 'all';
  scenario?: string | 'all';
  actionedBy?: string | 'all';
};

const HISTORY_STATUSES: ActionStatus[] = ['executed', 'rejected', 'failed', 'expired'];

export function useHistory(filters: HistoryFilters = {}) {
  return useQuery<SuggestionRow[]>({
    queryKey: ['history', filters],
    queryFn: async () => {
      let q = supabase
        .from(TABLE_AUTO_FOLLOWUP_LOG)
        .select('*')
        .eq('client_handle', CLIENT_HANDLE)
        .in('action_status', filters.status && filters.status !== 'all' ? [filters.status] : HISTORY_STATUSES)
        .order('actioned_at', { ascending: false, nullsFirst: false })
        .limit(500);

      if (filters.sinceIso) q = q.gte('actioned_at', filters.sinceIso);
      if (filters.scenario && filters.scenario !== 'all') q = q.eq('scenario', filters.scenario);
      if (filters.actionedBy && filters.actionedBy !== 'all') q = q.eq('actioned_by', filters.actionedBy);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SuggestionRow[];
    },
    staleTime: 30_000,
  });
}
