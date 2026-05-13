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
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Mensagem para enviar..."
        rows={6}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-1.5">
          {warnings.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200"
            >
              <AlertTriangle className="h-3 w-3" /> {w}
            </span>
          ))}
          {errors.map((e) => (
            <span
              key={e}
              className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-200"
            >
              <AlertCircle className="h-3 w-3" /> {e}
            </span>
          ))}
        </div>
        <span
          className={cn(
            'font-mono',
            value.length > MSG_MAX ? 'text-rose-300' : 'text-muted-foreground',
          )}
        >
          {value.length}/{MSG_MAX}
        </span>
      </div>
    </div>
  );
}
