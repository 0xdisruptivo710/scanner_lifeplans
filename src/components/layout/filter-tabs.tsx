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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {/* Pill chip group — AIOS pattern */}
      <div role="tablist" aria-label="Filtros de sugestão" className="flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => {
          const active = filter === t.value;
          const count = counts[t.value] ?? 0;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilterChange(t.value)}
              className={cn(
                'group inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                active
                  ? 'bg-primary-soft text-primary-soft-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span>{t.label}</span>
              <span
                className={cn(
                  'inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-full px-1 font-mono text-[10px] tracking-tight transition-colors',
                  active
                    ? 'bg-primary/12 text-primary'
                    : 'bg-muted text-subtle-foreground group-hover:bg-surface',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Confidence slider */}
      <div className="ml-auto flex w-[280px] items-center gap-3.5">
        <span className="whitespace-nowrap text-[12px] text-muted-foreground">
          Confiança mínima
        </span>
        <Slider
          min={0.5}
          max={1}
          step={0.01}
          value={[confidence]}
          onValueChange={(v) => onConfidenceChange(v[0] ?? 0.75)}
          className="flex-1"
        />
        <span className="w-9 text-right font-mono text-[12px] text-foreground">
          {confidence.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
