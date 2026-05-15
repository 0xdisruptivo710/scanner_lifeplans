import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CLIENT_HANDLE, TABLE_PANEL_MAPPING } from '@/lib/constants';
import type { PanelMappingRow } from '@/lib/types';

export type PanelMappingMap = Map<string, PanelMappingRow>;

export function usePanelMapping() {
  return useQuery<{ rows: PanelMappingRow[]; byKey: PanelMappingMap }>({
    queryKey: ['panel-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_PANEL_MAPPING)
        .select('*')
        .eq('client_handle', CLIENT_HANDLE);
      if (error) throw error;
      const rows = (data ?? []) as PanelMappingRow[];
      const byKey: PanelMappingMap = new Map();
      for (const r of rows) byKey.set(r.composite_key, r);
      return { rows, byKey };
    },
    staleTime: 5 * 60_000,
  });
}
