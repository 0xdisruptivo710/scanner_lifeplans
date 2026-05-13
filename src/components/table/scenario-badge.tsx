import { Badge } from '@/components/ui/badge';
import { SCENARIO_COLORS, SCENARIO_LABELS, type ScenarioKey } from '@/lib/constants';

export function ScenarioBadge({ scenario }: { scenario: string | null }) {
  if (!scenario) {
    return <Badge className="border-border bg-muted/40 text-muted-foreground">—</Badge>;
  }
  const key = scenario as ScenarioKey;
  const cls = SCENARIO_COLORS[key] ?? 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300';
  const label = SCENARIO_LABELS[key] ?? scenario;
  return <Badge className={cls}>{label}</Badge>;
}
