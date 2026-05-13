import { useMemo, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Route as rootRoute } from './__root';
import { FilterTabs, type FilterKey } from '@/components/layout/filter-tabs';
import { SuggestionsTable } from '@/components/table/suggestions-table';
import { BulkActionBar } from '@/components/layout/bulk-action-bar';
import { SuggestionDrawer } from '@/components/drawer/suggestion-drawer';
import { useSuggestions } from '@/hooks/use-suggestions';
import { usePanelMapping } from '@/hooks/use-panel-mapping';
import { useBulkApprove } from '@/hooks/use-approve';
import { useReject } from '@/hooks/use-reject';
import { useApprove } from '@/hooks/use-approve';
import { useTagsCatalog } from '@/hooks/use-tags-catalog';
import type { SuggestionRow } from '@/lib/types';

function InboxPage() {
  const suggestions = useSuggestions();
  const { data: mapping } = usePanelMapping();
  const { data: tagsCatalog } = useTagsCatalog();
  const bulkApprove = useBulkApprove();
  const reject = useReject();
  const approve = useApprove();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [confidence, setConfidence] = useState(0.75);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openRow, setOpenRow] = useState<SuggestionRow | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const rows = suggestions.data ?? [];

  const counts = useMemo(() => {
    const base = rows.filter((r) => (r.confidence ?? 0) >= confidence);
    return {
      all: base.length,
      msg: base.filter((r) => r.suggest_message).length,
      tag: base.filter((r) => !r.suggest_message).length,
      cold: base.filter(
        (r) => r.scenario === 'tag_only_no_engagement' || r.tag_applied === 'NÃO RESPONDE',
      ).length,
    };
  }, [rows, confidence]);

  const filtered = useMemo(() => {
    let r = rows.filter((row) => (row.confidence ?? 0) >= confidence);
    if (filter === 'msg') r = r.filter((row) => row.suggest_message);
    else if (filter === 'tag') r = r.filter((row) => !row.suggest_message);
    else if (filter === 'cold')
      r = r.filter(
        (row) => row.scenario === 'tag_only_no_engagement' || row.tag_applied === 'NÃO RESPONDE',
      );
    return r;
  }, [rows, filter, confidence]);

  const selectedRows = useMemo(
    () => filtered.filter((r) => selected.has(r.id)),
    [filtered, selected],
  );

  const handleBulkApprove = async () => {
    if (selectedRows.length === 0) return;
    setProgress({ done: 0, total: selectedRows.length });
    try {
      const out = await bulkApprove.mutateAsync({
        rows: selectedRows,
        mapping: mapping?.byKey,
        tagsCatalog,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const ok = out.filter((o) => o.status === 'executed').length;
      const fail = out.length - ok;
      if (fail === 0) toast.success(`${ok} aprovadas`);
      else toast.warning(`${ok} aprovadas · ${fail} falharam`);
      setSelected(new Set());
    } finally {
      setProgress(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedRows.length === 0) return;
    await reject.mutateAsync(selectedRows);
    toast(`${selectedRows.length} rejeitadas`);
    setSelected(new Set());
  };

  const handleQuickApprove = async (row: SuggestionRow) => {
    const out = await approve.mutateAsync({ row, mapping: mapping?.byKey, tagsCatalog });
    if (out.status === 'executed') toast.success('Aprovado');
    else toast.error('Falha ao aprovar');
  };

  const handleQuickReject = async (row: SuggestionRow) => {
    await reject.mutateAsync(row);
    toast('Rejeitado');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Caixa de sugestões</h2>
          <p className="text-xs text-muted-foreground">
            Revisar, editar e aprovar follow-ups gerados pela IA.
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {filtered.length} de {rows.length} visíveis
        </span>
      </div>

      <FilterTabs
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        confidence={confidence}
        onConfidenceChange={setConfidence}
      />

      <SuggestionsTable
        rows={filtered}
        loading={suggestions.isLoading}
        selected={selected}
        onSelectChange={setSelected}
        onRowClick={(r) => setOpenRow(r)}
        onQuickApprove={handleQuickApprove}
        onQuickReject={handleQuickReject}
      />

      <BulkActionBar
        selectedCount={selectedRows.length}
        busy={bulkApprove.isPending || reject.isPending}
        progress={progress}
        onApprove={handleBulkApprove}
        onReject={handleBulkReject}
        onClear={() => setSelected(new Set())}
      />

      <SuggestionDrawer
        row={openRow}
        open={!!openRow}
        onOpenChange={(o) => !o && setOpenRow(null)}
      />
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: InboxPage,
});
