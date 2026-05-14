import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { MSG_MAX } from '@/lib/constants';
import { validateMessage } from '@/lib/validation';
import { cn } from '@/lib/utils';

export function MessageEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { errors, warnings } = validateMessage(value);
  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Mensagem para enviar…"
        rows={6}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {warnings.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-medium text-[#92400E]"
            >
              <AlertTriangle className="h-3 w-3" /> {w}
            </span>
          ))}
          {errors.map((e) => (
            <span
              key={e}
              className="inline-flex items-center gap-1 rounded-full bg-destructive-soft px-2.5 py-0.5 text-[11px] font-medium text-destructive"
            >
              <AlertCircle className="h-3 w-3" /> {e}
            </span>
          ))}
        </div>
        <span
          className={cn(
            'font-mono text-[11px] tabular-nums',
            value.length > MSG_MAX ? 'text-destructive' : 'text-subtle-foreground',
          )}
        >
          {value.length}/{MSG_MAX}
        </span>
      </div>
    </div>
  );
}
