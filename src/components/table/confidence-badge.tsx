import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ConfidenceBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const rounded = Math.round(value * 100) / 100;
  const cls =
    value >= 0.85
      ? 'border-primary/30 bg-primary/10 text-primary'
      : value >= 0.7
        ? 'border-border bg-muted/40 text-muted-foreground'
        : 'border-destructive/30 bg-destructive/10 text-destructive';
  return <Badge className={cn('font-mono', cls)}>{rounded.toFixed(2)}</Badge>;
}
