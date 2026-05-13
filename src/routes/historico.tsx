import { useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './__root';
import { SuggestionsTable } from '@/components/table/suggestions-table';
import { SuggestionDrawer } from '@/components/drawer/suggestion-drawer';
import { useHistory } from '@/hooks/use-history';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SuggestionRow } from '@/lib/types';

const PERIODS: { label: string; days: number }[] = [
  { label: 'Últimas 24h', days: 1 },
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Tudo', days: 365 },
];

function HistoricoPage() {
  const [days, setDays] = useState(7);
  const [actionedBy, setActionedBy] = useState<string>('all');
  const [openRow, setOpenRow] = useState<SuggestionRow | null>(null);

  const sinceIso = useMemo(
    () => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    [days],
  );

  const history = useHistory({ sinceIso, status: 'executed', actionedBy });
  const rows = history.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Ações Aprovadas</h2>
          <p className="text-xs text-muted-foreground">
            Follow-ups aprovados e executados com sucesso.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{rows.length} registros</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <FilterField label="Período">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.days} value={String(p.days)}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Operador">
          <Select value={actionedBy} onValueChange={setActionedBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Murilo">Murilo</SelectItem>
              <SelectItem value="Lucas">Lucas</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      </div>

      <SuggestionsTable
        rows={rows}
        loading={history.isLoading}
        selected={new Set()}
        onSelectChange={() => {}}
        onRowClick={(r) => setOpenRow(r)}
        onQuickApprove={() => {}}
        onQuickReject={() => {}}
        readOnly
      />

      <SuggestionDrawer
        row={openRow}
        open={!!openRow}
        onOpenChange={(o) => !o && setOpenRow(null)}
        readOnly
      />
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-xs">
      <span className="block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/historico',
  component: HistoricoPage,
});
