import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CLIENT_HANDLE } from '@/lib/constants';
import type { SuggestionRow } from '@/lib/types';

export function useSuggestions(opts?: { pollMs?: number | false }) {
  return useQuery<SuggestionRow[]>({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wts_auto_followup_log')
        .select('*')
        .eq('client_handle', CLIENT_HANDLE)
        .eq('action_status', 'pending')
        .order('classified_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SuggestionRow[];
    },
    refetchInterval: opts?.pollMs === false ? false : opts?.pollMs ?? false,
    staleTime: 15_000,
  });
}
