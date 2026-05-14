import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DrawerActions({
  busy,
  approveLabel = 'Aprovar e enviar',
  approveDisabled,
  onApprove,
  onReject,
  onCancel,
  readOnly,
}: {
  busy?: boolean;
  approveLabel?: string;
  approveDisabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <Button variant="outline" onClick={onCancel}>
        Fechar
      </Button>
    );
  }
  return (
    <>
      <Button variant="ghost" onClick={onCancel} disabled={busy}>
        Cancelar
      </Button>
      <Button variant="outline" onClick={onReject} disabled={busy}>
        <X className="h-3.5 w-3.5" /> Rejeitar
      </Button>
      <Button onClick={onApprove} disabled={busy || approveDisabled}>
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        {busy ? 'Aprovando…' : approveLabel}
      </Button>
    </>
  );
}
