import type { ColumnDef } from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { TypeBadge } from './type-badge';
import { ScenarioBadge } from './scenario-badge';
import { ConfidenceBadge } from './confidence-badge';
import { anonymizePhone, formatRelativeTime, truncate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ActionStatus, SuggestionRow } from '@/lib/types';

type Args = {
  selected: Set<number>;
  allRows: SuggestionRow[];
  onSelectChange: (next: Set<number>) => void;
  onQuickApprove: (row: SuggestionRow) => void;
  onQuickReject: (row: SuggestionRow) => void;
  readOnly?: boolean;
};

const STATUS_STYLES: Record<ActionStatus, { bg: string; label: string }> = {
  executed:  { bg: 'bg-success-soft text-success/90',         label: 'Executado' },
  approved:  { bg: 'bg-primary-soft text-primary-soft-foreground', label: 'Aprovado' },
  rejected:  { bg: 'bg-muted text-muted-foreground',          label: 'Rejeitado' },
  failed:    { bg: 'bg-destructive-soft text-destructive/90', label: 'Falhou'    },
  expired:   { bg: 'bg-warning-soft text-[#92400E]',          label: 'Expirado'  },
  pending:   { bg: 'bg-muted text-muted-foreground',          label: 'Pendente'  },
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
      size: 40,
      header: () => (
        <span data-no-row-click className="flex items-center">
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
        <span data-no-row-click className="flex items-center">
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
      size: 120,
      header: 'Tipo',
      cell: ({ row }) => <TypeBadge suggestMessage={row.original.suggest_message} />,
    },
    {
      id: 'scenario',
      size: 210,
      header: 'Cenário',
      cell: ({ row }) => <ScenarioBadge scenario={row.original.scenario} />,
    },
    {
      id: 'customer',
      size: 200,
      header: 'Cliente',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 leading-tight">
          <span className="text-[13px] font-medium text-foreground">
            {row.original.customer_name ?? '—'}
          </span>
          <span className="font-mono text-[11px] text-subtle-foreground">
            {anonymizePhone(row.original.customer_phone)}
          </span>
        </div>
      ),
    },
    {
      id: 'preview',
      size: 340,
      header: 'Resumo IA',
      cell: ({ row }) => (
        <span className="text-[12.5px] text-muted-foreground">
          {truncate(row.original.message_sent ?? row.original.reasoning_short, 90)}
        </span>
      ),
    },
    {
      id: 'confidence',
      size: 90,
      header: 'Conf.',
      accessorFn: (r) => r.confidence ?? 0,
      cell: ({ row }) => <ConfidenceBadge value={row.original.confidence} />,
    },
    {
      id: 'classified_at',
      size: 90,
      header: 'Há',
      accessorFn: (r) => r.classified_at,
      cell: ({ row }) => (
        <span className="font-mono text-[11.5px] text-subtle-foreground">
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
            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-success-soft hover:text-success"
            onClick={() => onQuickApprove(row.original)}
            aria-label="Aprovar"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
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
      size: 130,
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.action_status;
        const style = (s && STATUS_STYLES[s]) ?? null;
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5',
              style?.bg ?? 'bg-muted text-muted-foreground',
            )}
          >
            {style?.label ?? '—'}
          </span>
        );
      },
    });
  }

  return cols;
}
