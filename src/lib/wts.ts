import { WHATSAPP_FROM, WTS_BASE } from './constants';
import { normalizePhoneBR } from './format';
import type { WtsResult } from './types';

async function wtsFetch<T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  body?: unknown,
): Promise<WtsResult<T>> {
  // Build proxy URL: /api/wts?p=<wts-pathname>&<wts-query>
  const [wtsPathname, wtsQuery] = path.split('?', 2);
  const params = new URLSearchParams();
  params.set('p', wtsPathname ?? '');
  if (wtsQuery) {
    const wtsParams = new URLSearchParams(wtsQuery);
    wtsParams.forEach((v, k) => params.append(k, v));
  }
  const proxyUrl = `${WTS_BASE}?${params.toString()}`;

  try {
    const res = await fetch(proxyUrl, {
      method,
      headers: {
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      const errMsg =
        (parsed && typeof parsed === 'object' && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : null) ?? (typeof parsed === 'string' ? parsed : `HTTP ${res.status}`);
      return { ok: false, status: res.status, error: errMsg };
    }

    return { ok: true, data: (parsed as T) ?? (null as unknown as T) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network_error';
    return { ok: false, status: 0, error: msg };
  }
}

export async function wtsApplyTag(phone: string, tag: string): Promise<WtsResult> {
  const p = encodeURIComponent(normalizePhoneBR(phone));
  return wtsFetch('POST', `/core/v1/contact/phonenumber/${p}/tags`, {
    tagNames: [tag],
    operation: 'InsertIfNotExists',
  });
}

export async function wtsGetContact(
  phone: string,
): Promise<WtsResult<{ id: string; name?: string; phoneNumber?: string }>> {
  const p = encodeURIComponent(normalizePhoneBR(phone));
  return wtsFetch('GET', `/core/v1/contact/phonenumber/${p}`);
}

export async function wtsGetContactById(
  contactId: string,
): Promise<WtsResult<{ id: string; name?: string; phoneNumber?: string }>> {
  return wtsFetch('GET', `/core/v1/contact/${encodeURIComponent(contactId)}`);
}

export async function wtsGetSession(
  sessionId: string,
): Promise<WtsResult<{ id: string; contactId: string; title?: string | null }>> {
  return wtsFetch('GET', `/chat/v2/session/${encodeURIComponent(sessionId)}`);
}

export async function wtsGetCards(
  panelId: string,
  contactId: string,
): Promise<WtsResult<{ id: string }[]>> {
  const qs = new URLSearchParams({
    PanelId: panelId,
    ContactId: contactId,
    PageSize: '5',
  });
  const res = await wtsFetch<{ items?: { id: string }[] } | { id: string }[]>(
    'GET',
    `/crm/v1/panel/card?${qs.toString()}`,
  );
  if (!res.ok) return res;
  const raw = res.data;
  const items = Array.isArray(raw) ? raw : raw?.items ?? [];
  return { ok: true, data: items };
}

export async function wtsMoveCard(cardId: string, stepId: string): Promise<WtsResult> {
  return wtsFetch('PUT', `/crm/v2/panel/card/${encodeURIComponent(cardId)}`, { stepId });
}

export async function wtsCreateCard(
  panelId: string,
  stepId: string,
  contactId: string,
): Promise<WtsResult<{ id: string }>> {
  return wtsFetch('POST', `/crm/v1/panel/card`, { panelId, stepId, contactId });
}

export async function wtsSendMessage(phone: string, text: string): Promise<WtsResult> {
  const to = normalizePhoneBR(phone);
  if (!to) return { ok: false, status: 0, error: 'invalid_phone' };
  return wtsFetch('POST', `/chat/v1/message/send`, {
    body: { text },
    to,
    from: WHATSAPP_FROM,
  });
}
