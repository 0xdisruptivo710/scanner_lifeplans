import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BulkActionBar({
  selectedCount,
  busy,
  onApprove,
  onReject,
  onClear,
  progress,
}: {
  selectedCount: number;
  busy?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  progress?: { done: number; total: number } | null;
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-lg">
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selectedCount}</span> selecionad
          {selectedCount === 1 ? 'a' : 'as'}
          {progress && (
            <span className="ml-2 font-mono">
              · {progress.done}/{progress.total}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onApprove} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Aprovar todas
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
            <X className="h-3.5 w-3.5" /> Rejeitar todas
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
