import { Inbox } from 'lucide-react';

export function EmptyState({
  title = 'Caixa zerada',
  description = 'Sem sugestões pendentes no momento.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
        <Inbox className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h3 className="text-[15px] font-medium text-foreground">{title}</h3>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
