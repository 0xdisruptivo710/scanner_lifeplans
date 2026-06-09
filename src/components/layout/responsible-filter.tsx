import { Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ResponsibleOption } from '@/lib/responsibles';

export function ResponsibleFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ResponsibleOption[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        Responsável
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className="h-8 w-[210px] rounded-full"
          aria-label="Filtrar sugestões por responsável"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label} ({o.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
