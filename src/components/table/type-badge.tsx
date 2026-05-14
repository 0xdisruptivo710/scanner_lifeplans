import { MessageCircle, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function TypeBadge({ suggestMessage }: { suggestMessage: boolean | null }) {
  if (suggestMessage) {
    return (
      <Badge variant="primary" className="pl-2">
        <MessageCircle className="h-3 w-3" /> Mensagem
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" className="pl-2">
      <Tag className="h-3 w-3" /> Tag/Coluna
    </Badge>
  );
}
