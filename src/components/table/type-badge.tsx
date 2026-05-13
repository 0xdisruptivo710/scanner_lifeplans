import { MessageSquare, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function TypeBadge({ suggestMessage }: { suggestMessage: boolean | null }) {
  if (suggestMessage) {
    return (
      <Badge className={cn('border-primary/30 bg-primary/10 text-primary')}>
        <MessageSquare className="h-3 w-3" /> Msg
      </Badge>
    );
  }
  return (
    <Badge className="border-muted-foreground/30 bg-muted/40 text-muted-foreground">
      <Tag className="h-3 w-3" /> Tag/Coluna
    </Badge>
  );
}
