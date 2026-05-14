import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SCENARIO_COLORS, SCENARIO_LABELS, type ScenarioKey } from '@/lib/constants';

export function ScenarioBadge({ scenario }: { scenario: string | null }) {
  if (!scenario) {
    return (
      <Badge variant="neutral" className="text-subtle-foreground">
        —
      </Badge>
    );
  }
  const key = scenario as ScenarioKey;
  const cls = SCENARIO_COLORS[key] ?? 'bg-muted text-muted-foreground';
  const label = SCENARIO_LABELS[key] ?? scenario;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap',
        cls,
      )}
    >
      {label}
    </span>
  );
}
