import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CLIENT_HANDLE, TABLE_AUTO_FOLLOWUP_LOG } from '@/lib/constants';
import type { SuggestionRow } from '@/lib/types';

export function useSuggestions(opts?: { pollMs?: number | false }) {
  return useQuery<SuggestionRow[]>({
    queryKey: ['suggestions'],
    queryFn: async () => {
      // "Em aberto" = ainda não actioned. O scanner Life Plans grava NULL (não
      // 'pending'), então o inbox precisa aceitar ambos (ver client_vars §9.1).
      const { data, error } = await supabase
        .from(TABLE_AUTO_FOLLOWUP_LOG)
        .select('*')
        .eq('client_handle', CLIENT_HANDLE)
        .or('action_status.is.null,action_status.eq.pending')
        .order('classified_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SuggestionRow[];
    },
    refetchInterval: opts?.pollMs === false ? false : opts?.pollMs ?? false,
    staleTime: 15_000,
  });
}
