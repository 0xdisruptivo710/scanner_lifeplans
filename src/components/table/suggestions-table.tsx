import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import { buildColumns } from './columns';
import type { SuggestionRow } from '@/lib/types';

type Props = {
  rows: SuggestionRow[];
  loading?: boolean;
  selected: Set<number>;
  onSelectChange: (next: Set<number>) => void;
  onRowClick: (row: SuggestionRow) => void;
  onQuickApprove: (row: SuggestionRow) => void;
  onQuickReject: (row: SuggestionRow) => void;
  readOnly?: boolean;
};

export function SuggestionsTable({
  rows,
  loading,
  selected,
  onSelectChange,
  onRowClick,
  onQuickApprove,
  onQuickReject,
  readOnly,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'classified_at', desc: true },
  ]);

  const columns = buildColumns({
    selected,
    allRows: rows,
    onSelectChange,
    onQuickApprove,
    onQuickReject,
    readOnly,
  });

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="space-y-2 p-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((h) => (
                <TableHead key={h.id} style={{ width: h.column.columnDef.size }}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((r) => {
            const id = r.original.id;
            const isSelected = selected.has(id);
            return (
              <TableRow
                key={r.id}
                data-state={isSelected ? 'selected' : undefined}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('[data-no-row-click]')) return;
                  onRowClick(r.original);
                }}
                className="cursor-pointer"
              >
                {r.getVisibleCells().map((c) => (
                  <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
