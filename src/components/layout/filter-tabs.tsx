import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export type FilterKey = 'all' | 'msg' | 'tag' | 'cold';

const TABS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'msg', label: 'Com mensagem' },
  { value: 'tag', label: 'Só tag/coluna' },
  { value: 'cold', label: 'Lead frio' },
];

export function FilterTabs({
  filter,
  onFilterChange,
  counts,
  confidence,
  onConfidenceChange,
}: {
  filter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  counts: Record<FilterKey, number>;
  confidence: number;
  onConfidenceChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Tabs value={filter} onValueChange={(v) => onFilterChange(v as FilterKey)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              <span>{t.label}</span>
              <span
                className={cn(
                  'rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]',
                  filter === t.value && 'bg-primary/15 text-primary',
                )}
              >
                {counts[t.value] ?? 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="ml-auto flex w-[260px] items-center gap-3">
        <span className="whitespace-nowrap text-xs text-muted-foreground">Confiança ≥</span>
        <Slider
          min={0.5}
          max={1}
          step={0.01}
          value={[confidence]}
          onValueChange={(v) => onConfidenceChange(v[0] ?? 0.75)}
          className="flex-1"
        />
        <span className="w-10 text-right font-mono text-xs">{confidence.toFixed(2)}</span>
      </div>
    </div>
  );
}
