import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScenarioBadge } from '@/components/table/scenario-badge';
import { ConfidenceBadge } from '@/components/table/confidence-badge';
import { TypeBadge } from '@/components/table/type-badge';
import { TagSelect } from './tag-select';
import { ColumnSelect } from './column-select';
import { MessageEditor } from './message-editor';
import { WhatsappPreview } from './whatsapp-preview';
import { DrawerActions } from './drawer-actions';
import { useApprove } from '@/hooks/use-approve';
import { useReject } from '@/hooks/use-reject';
import { usePanelMapping } from '@/hooks/use-panel-mapping';
import { anonymizePhone, formatDateTime, formatRelativeTime } from '@/lib/format';
import { validateMessage } from '@/lib/validation';
import type { SuggestionRow, WtsErrorEntry } from '@/lib/types';

type Props = {
  row: SuggestionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
};

export function SuggestionDrawer({ row, open, onOpenChange, readOnly }: Props) {
  const approve = useApprove();
  const reject = useReject();
  const { data: mapping } = usePanelMapping();

  const [tag, setTag] = useState<string | null>(null);
  const [column, setColumn] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!row) return;
    setTag(row.tag_applied);
    setColumn(row.column_applied);
    setMessage(row.human_message_override ?? row.message_sent ?? '');
  }, [row?.id]);

  const validation = useMemo(() => validateMessage(message), [message]);

  if (!row) return null;

  const overrideTag = tag !== row.tag_applied;
  const overrideColumn = column !== row.column_applied;
  const overrideMessage = message !== (row.message_sent ?? '');

  const approveDisabled =
    (row.suggest_message ? !validation.valid : false) || !!readOnly;

  const handleApprove = async () => {
    const effective: SuggestionRow = {
      ...row,
      tag_applied: tag,
      column_applied: column,
    };
    const out = await approve.mutateAsync({
      row: effective,
      override: overrideMessage ? validation.cleaned : null,
      mapping: mapping?.byKey,
    });
    if (out.status === 'executed') {
      toast.success('Aprovado', {
        description: row.suggest_message
          ? 'Tag, card e mensagem disparados.'
          : 'Tag aplicada e card atualizado.',
      });
      onOpenChange(false);
    } else {
      const errSummary = Object.entries(out.errors)
        .filter(([, v]) => !(v as WtsErrorEntry).ok)
        .map(([k, v]) => `${k}: ${(v as WtsErrorEntry).error}`)
        .join(' · ');
      toast.error('Falha ao aprovar', { description: errSummary || 'Veja wts_errors.' });
    }
  };

  const handleReject = async () => {
    await reject.mutateAsync(row);
    toast('Sugestão rejeitada');
    onOpenChange(false);
  };

  const busy = approve.isPending || reject.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TypeBadge suggestMessage={row.suggest_message} />
            <ScenarioBadge scenario={row.scenario} />
            <ConfidenceBadge value={row.confidence} />
          </SheetTitle>
          <SheetDescription>
            <span className="font-mono">{row.session_id.slice(0, 8)}…</span> · classificado{' '}
            {formatRelativeTime(row.classified_at)} atrás
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <Field label="Cliente">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm">{row.customer_name ?? '—'}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {anonymizePhone(row.customer_phone)}
              </span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              {formatDateTime(row.classified_at)}
            </p>
          </Field>

          {row.reasoning_short && (
            <Field label="Razão da IA">
              <p className="text-sm leading-relaxed text-foreground/90">{row.reasoning_short}</p>
            </Field>
          )}

          <Separator />

          <Field label="Ação sugerida">
            <div className="grid grid-cols-1 gap-3">
              <Labeled label="Tag" override={overrideTag}>
                <TagSelect value={tag} onChange={setTag} disabled={readOnly} />
              </Labeled>
              <Labeled label="Coluna" override={overrideColumn}>
                <ColumnSelect value={column} onChange={setColumn} disabled={readOnly} />
              </Labeled>
            </div>
          </Field>

          {row.suggest_message ? (
            <>
              <Separator />
              <Field
                label="Mensagem"
                hint={overrideMessage ? 'editada por humano' : 'sugerida pela IA'}
              >
                <MessageEditor value={message} onChange={setMessage} disabled={readOnly} />
              </Field>
              <Field label="Preview no WhatsApp">
                <WhatsappPreview text={validation.cleaned} />
              </Field>
            </>
          ) : (
            <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              IA não sugere envio de mensagem. Aprovação aplica apenas tag e move/cria o card.
            </div>
          )}

          {row.wts_errors && readOnly && (
            <Field label="Erros WTS">
              <pre className="overflow-auto rounded-md border border-border bg-muted/20 p-3 font-mono text-[10px] text-rose-200">
                {JSON.stringify(row.wts_errors, null, 2)}
              </pre>
            </Field>
          )}

          <a
            href={`https://app.aioscrm.com/redirect?type=SESSION&id=${row.session_id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Ver no WTS <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <SheetFooter>
          <DrawerActions
            busy={busy}
            approveDisabled={approveDisabled}
            approveLabel={row.suggest_message ? 'Aprovar e enviar' : 'Aplicar tag e mover card'}
            onApprove={handleApprove}
            onReject={handleReject}
            onCancel={() => onOpenChange(false)}
            readOnly={readOnly}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</h3>
        {hint && <span className="font-mono text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Labeled({
  label,
  override,
  children,
}: {
  label: string;
  override?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-xs">
      <div className="flex items-baseline gap-2">
        <span className="text-muted-foreground">{label}</span>
        {override && (
          <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] text-primary">
            editado
          </span>
        )}
      </div>
      {children}
    </label>
  );
}
