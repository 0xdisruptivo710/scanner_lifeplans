import { Inbox } from 'lucide-react';

export function EmptyState({
  title = 'Caixa zerada',
  description = 'Sem sugestões pendentes no momento.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="rounded-full border border-border bg-muted/30 p-3">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
