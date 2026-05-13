import { Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function WhatsappPreview({ text }: { text: string }) {
  const now = format(new Date(), 'HH:mm', { locale: ptBR });
  return (
    <div className="rounded-lg border border-border bg-[#0b1d17] p-4">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-emerald-300/70">
        Forma de Ser · Itupeva
      </div>
      <div className="ml-auto inline-flex max-w-[85%] flex-col gap-1 rounded-lg rounded-tr-sm bg-emerald-700/30 px-3 py-2 text-sm text-emerald-50">
        <div className="whitespace-pre-wrap leading-relaxed">{text || '—'}</div>
        <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/70">
          {now}
          <CheckCheck className="h-3 w-3" />
          <Check className="hidden h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
