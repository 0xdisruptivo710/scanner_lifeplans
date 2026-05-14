import { cn } from '@/lib/utils';

/*
 * Confidence is a frequent eye-target — render as a tabular-numerals figure
 * rather than a pill so it reads as data, not as a status.
 */
export function ConfidenceBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-subtle-foreground">—</span>;
  const rounded = Math.round(value * 100) / 100;
  const tone =
    value >= 0.85
      ? 'text-primary'
      : value >= 0.7
        ? 'text-foreground'
        : 'text-destructive';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          value >= 0.85
            ? 'bg-primary'
            : value >= 0.7
              ? 'bg-muted-foreground/40'
              : 'bg-destructive',
        )}
      />
      <span className={cn('font-mono text-[12px] tabular-nums', tone)}>
        {rounded.toFixed(2)}
      </span>
    </span>
  );
}
