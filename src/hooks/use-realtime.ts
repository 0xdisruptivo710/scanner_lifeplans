import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CLIENT_HANDLE } from '@/lib/constants';
import type { RealtimeStatus } from '@/lib/types';

export function useRealtime() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('CONNECTING');
  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('aios-inteligence-followup')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wts_auto_followup_log',
          filter: `client_handle=eq.${CLIENT_HANDLE}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['suggestions'] });
          qc.invalidateQueries({ queryKey: ['history'] });
        },
      )
      .subscribe((s) => {
        setStatus(s as RealtimeStatus);
      });

    fallbackTimer.current = window.setTimeout(() => {
      qc.invalidateQueries({ queryKey: ['suggestions'] });
    }, 10_000);

    return () => {
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return status;
}
