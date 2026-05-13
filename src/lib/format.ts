import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function normalizePhoneBR(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return digits;
}

export function anonymizePhone(input: string | null | undefined): string {
  if (!input) return '—';
  const d = input.replace(/\D/g, '');
  const local = d.startsWith('55') ? d.slice(2) : d;
  if (local.length < 8) return input;
  const ddd = local.slice(0, 2);
  const last4 = local.slice(-4);
  const middle = local.length === 11 ? '9****' : '****';
  return `+55 (${ddd}) ${middle}-${last4}`;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: false });
  } catch {
    return '—';
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return '—';
  }
}

export function truncate(input: string | null | undefined, max = 80): string {
  if (!input) return '—';
  if (input.length <= max) return input;
  return input.slice(0, max - 1).trimEnd() + '…';
}
