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
  const ratio = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto relative flex items-center gap-4 overflow-hidden rounded-full border border-border bg-surface px-2 py-2 pl-5 shadow-[0_20px_50px_-12px_rgb(17_24_39/0.18),0_0_0_1px_rgb(229_231_235/0.6)] animate-fade-in">
        {progress && (
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 bg-primary-soft/70 transition-[width] duration-300 ease-out"
            style={{ width: `${ratio}%` }}
          />
        )}
        <div className="relative flex items-center gap-2 text-[13px]">
          <span className="font-mono font-medium tabular-nums text-foreground">
            {selectedCount}
          </span>
          <span className="text-muted-foreground">
            selecionad{selectedCount === 1 ? 'a' : 'as'}
          </span>
          {progress && (
            <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 font-mono text-[11px] text-primary-soft-foreground">
              {progress.done}/{progress.total}
            </span>
          )}
        </div>

        <div className="relative flex items-center gap-1.5">
          <Button size="sm" onClick={onApprove} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Aprovar todas
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
            <X className="h-3.5 w-3.5" /> Rejeitar
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear} disabled={busy}>
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
