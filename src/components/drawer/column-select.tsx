import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePanelMapping } from '@/hooks/use-panel-mapping';

const ALLOWED_PANEL = 'PipeLine Saúde [IA]';

export function ColumnSelect({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const { data } = usePanelMapping();
  const grouped = useMemo(() => {
    const m = new Map<string, { panel: string; steps: { key: string; name: string }[] }>();
    for (const row of data?.rows ?? []) {
      if (row.panel_name !== ALLOWED_PANEL) continue;
      if (!m.has(row.panel_name)) m.set(row.panel_name, { panel: row.panel_name, steps: [] });
      m.get(row.panel_name)!.steps.push({ key: row.composite_key, name: row.step_name });
    }
    return Array.from(m.values());
  }, [data?.rows]);

  return (
    <Select value={value ?? undefined} onValueChange={(v) => onChange(v || null)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Sem coluna" />
      </SelectTrigger>
      <SelectContent className="max-h-[320px]">
        {grouped.map((g) => (
          <div key={g.panel} className="px-2 py-1">
            <div className="px-1 pb-1 text-[10px] font-medium uppercase tracking-[0.05em] text-subtle-foreground">
              {g.panel}
            </div>
            {g.steps.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.name}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
