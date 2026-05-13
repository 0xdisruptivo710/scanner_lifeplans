import type { ColumnDef } from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { TypeBadge } from './type-badge';
import { ScenarioBadge } from './scenario-badge';
import { ConfidenceBadge } from './confidence-badge';
import { anonymizePhone, formatRelativeTime, truncate } from '@/lib/format';
import type { SuggestionRow } from '@/lib/types';

type Args = {
  selected: Set<number>;
  allRows: SuggestionRow[];
  onSelectChange: (next: Set<number>) => void;
  onQuickApprove: (row: SuggestionRow) => void;
  onQuickReject: (row: SuggestionRow) => void;
  readOnly?: boolean;
};

export function buildColumns({
  selected,
  allRows,
  onSelectChange,
  onQuickApprove,
  onQuickReject,
  readOnly,
}: Args): ColumnDef<SuggestionRow>[] {
  const cols: ColumnDef<SuggestionRow>[] = [];

  if (!readOnly) {
    cols.push({
      id: 'select',
      size: 36,
      header: () => (
        <span data-no-row-click>
          <Checkbox
            checked={allRows.length > 0 && allRows.every((r) => selected.has(r.id))}
            onCheckedChange={(v) => {
              const next = new Set(selected);
              if (v) allRows.forEach((r) => next.add(r.id));
              else allRows.forEach((r) => next.delete(r.id));
              onSelectChange(next);
            }}
            aria-label="Selecionar tudo"
          />
        </span>
      ),
      cell: ({ row }) => (
        <span data-no-row-click>
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={(v) => {
              const next = new Set(selected);
              if (v) next.add(row.original.id);
              else next.delete(row.original.id);
              onSelectChange(next);
            }}
            aria-label="Selecionar linha"
          />
        </span>
      ),
    });
  }

  cols.push(
    {
      id: 'type',
      size: 110,
      header: 'Tipo',
      cell: ({ row }) => <TypeBadge suggestMessage={row.original.suggest_message} />,
    },
    {
      id: 'scenario',
      size: 200,
      header: 'Cenário',
      cell: ({ row }) => <ScenarioBadge scenario={row.original.scenario} />,
    },
    {
      id: 'customer',
      size: 180,
      header: 'Cliente',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.customer_name ?? '—'}</span>
      ),
    },
    {
      id: 'phone',
      size: 170,
      header: 'Telefone',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {anonymizePhone(row.original.customer_phone)}
        </span>
      ),
    },
    {
      id: 'preview',
      size: 320,
      header: 'Resumo IA',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {truncate(row.original.message_sent ?? row.original.reasoning_short, 80)}
        </span>
      ),
    },
    {
      id: 'confidence',
      size: 80,
      header: 'Conf',
      accessorFn: (r) => r.confidence ?? 0,
      cell: ({ row }) => <ConfidenceBadge value={row.original.confidence} />,
    },
    {
      id: 'classified_at',
      size: 100,
      header: 'Há',
      accessorFn: (r) => r.classified_at,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatRelativeTime(row.original.classified_at)}
        </span>
      ),
    },
  );

  if (!readOnly) {
    cols.push({
      id: 'actions',
      size: 120,
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1" data-no-row-click>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
            onClick={() => onQuickApprove(row.original)}
            aria-label="Aprovar"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            onClick={() => onQuickReject(row.original)}
            aria-label="Rejeitar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    });
  } else {
    cols.push({
      id: 'action_status',
      size: 110,
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.action_status;
        const cls =
          s === 'executed'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            : s === 'rejected'
              ? 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300'
              : s === 'failed'
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-200';
        return (
          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
            {s ?? '—'}
          </span>
        );
      },
    });
  }

  return cols;
}
