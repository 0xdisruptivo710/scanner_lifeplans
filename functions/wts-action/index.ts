// supabase/functions/wts-action/index.ts
//
// Edge Function AIOS Inteligence: executa uma sugestão CRM aprovada pelo humano.
//
// Aceita action_type (do body OU inferido do log):
//   - 'apply_all'   : aplica tag + (move OU cria) card + envia msg  (suggest_message=true)
//   - 'tag_only'    : aplica tag + (move OU cria) card, sem msg     (suggest_message=false)
//   - 'tag'         : só aplica tag
//   - 'card_only'   : só move/cria card
//   - 'message_only': só envia msg (raro)
//   - 'archive'     : só atualiza action_status='archived', nenhuma chamada WTS
//
// Para card: se já existe (contact tem card no painel) → PUT move; senão → POST cria.
//
// Auth: Supabase JWT (anon key OK).
// Deploy: supabase functions deploy wts-action --project-ref ehlpmukjdknnyhkycncb

import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const WHATSAPP_FROM_BY_CLIENT: Record<string, string> = {
  itupeva: "5511913352918",
};

const WTS_BASE = "https://api.wts.chat";

type ActionType = "apply_all" | "tag_only" | "tag" | "card_only" | "message_only" | "archive";

type ActionRequest = {
  log_id: number;
  action_type?: ActionType;
  message_override?: string;
  actioned_by: string;
};

type LogRow = {
  id: number;
  client_handle: string;
  session_id: string;
  customer_phone: string | null;
  tag_applied: string | null;
  column_applied: string | null;
  message_sent: string | null;
  suggest_message: boolean | null;
  action_status: string | null;
};

type WtsErrors = Record<string, { ok: boolean; status?: number; error?: string; details?: any }>;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });

const corsHeaders = () => ({
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
});

async function wtsRequest(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: any; error: string | null }> {
  try {
    const resp = await fetch(`${WTS_BASE}${path}`, {
      method,
      headers: {
        "Authorization": token,
        "accept": "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await resp.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    return {
      status: resp.status,
      data: parsed,
      error: resp.ok ? null : (parsed?.text || parsed?.message || `HTTP ${resp.status}`),
    };
  } catch (e) {
    return { status: 0, data: null, error: (e as Error).message };
  }
}

function normalizePhoneToBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : "55" + digits;
}

function inferActionType(log: LogRow): ActionType {
  if (log.suggest_message === true) return "apply_all";
  if (log.suggest_message === false) return "tag_only";
  return "tag_only";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  // Healthcheck: GET sem efeito colateral (usado pelo /debug do Lovable)
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("healthcheck") === "1") {
      return json(200, {
        ok: true,
        function: "wts-action",
        timestamp: new Date().toISOString(),
        env: {
          has_supabase_url: !!SUPABASE_URL,
          has_service_role: !!SUPABASE_SERVICE_ROLE_KEY,
        },
      });
    }
    return json(405, { error: "method_not_allowed", hint: "use ?healthcheck=1 para ping" });
  }

  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  let body: ActionRequest;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  if (!body.log_id || !body.actioned_by) {
    return json(400, { error: "missing_fields", fields: ["log_id", "actioned_by"] });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Load log row
  const { data: logRow, error: logErr } = await sb
    .from("wts_auto_followup_log")
    .select("id, client_handle, session_id, customer_phone, tag_applied, column_applied, message_sent, suggest_message, action_status")
    .eq("id", body.log_id)
    .single();

  if (logErr || !logRow) return json(404, { error: "log_not_found", details: logErr?.message });
  const log = logRow as LogRow;

  if (log.action_status !== "pending") {
    return json(409, {
      error: "log_not_pending",
      current_status: log.action_status,
      message: "Essa sugestão já foi tratada.",
    });
  }

  const actionType: ActionType = body.action_type ?? inferActionType(log);

  // Archive shortcut — no WTS calls
  if (actionType === "archive") {
    const { error: updErr } = await sb
      .from("wts_auto_followup_log")
      .update({
        action_status: "rejected",
        actioned_by: body.actioned_by,
        actioned_at: new Date().toISOString(),
      })
      .eq("id", log.id);
    if (updErr) return json(500, { error: "log_update_failed", details: updErr.message });
    return json(200, { status: "rejected", log_id: log.id, actions: {} });
  }

  // Token WTS por cliente
  const { data: secretRow, error: secErr } = await sb
    .from("_secrets")
    .select("value")
    .eq("client_handle", log.client_handle)
    .eq("key", "tokenwts")
    .single();

  if (secErr || !secretRow?.value) {
    return json(500, { error: "wts_token_missing", client_handle: log.client_handle });
  }
  const wtsToken = secretRow.value as string;

  // Resolve panel + step
  let panelId: string | null = null;
  let stepId: string | null = null;
  let panelResolveErr: string | null = null;

  if (log.column_applied) {
    const { data: mapRow } = await sb
      .from("wts_panel_mapping")
      .select("panel_id, step_id")
      .eq("client_handle", log.client_handle)
      .eq("composite_key", log.column_applied)
      .maybeSingle();
    if (mapRow) { panelId = mapRow.panel_id; stepId = mapRow.step_id; }
    else panelResolveErr = `composite_key_not_found:${log.column_applied}`;
  }

  const messageText = (body.message_override?.trim() || log.message_sent || "").trim();
  const wantsTag = (actionType === "apply_all" || actionType === "tag_only" || actionType === "tag") && !!log.tag_applied;
  const wantsCard = (actionType === "apply_all" || actionType === "tag_only" || actionType === "card_only") && !!panelId && !!stepId;
  const wantsMessage = (actionType === "apply_all" || actionType === "message_only") && !!messageText;

  const errors: WtsErrors = {};
  const ts = () => new Date().toISOString();
  const updates: Record<string, any> = {
    actioned_by: body.actioned_by,
    actioned_at: ts(),
    human_message_override: body.message_override ?? null,
  };

  // -------- Action 1: Apply tag --------
  if (wantsTag) {
    if (!log.customer_phone) {
      errors.apply_tag = { ok: false, error: "customer_phone_missing" };
    } else {
      const res = await wtsRequest(
        wtsToken,
        "POST",
        `/core/v1/contact/phonenumber/${encodeURIComponent(log.customer_phone)}/tags`,
        { tagNames: [log.tag_applied], operation: "InsertIfNotExists" },
      );
      if (res.error) errors.apply_tag = { ok: false, status: res.status, error: res.error };
      else { errors.apply_tag = { ok: true }; updates.wts_tag_applied_at = ts(); }
    }
  }

  // -------- Action 2: Move OR create card --------
  if (wantsCard) {
    if (panelResolveErr) {
      errors.card = { ok: false, error: panelResolveErr };
    } else if (!log.customer_phone) {
      errors.card = { ok: false, error: "customer_phone_missing" };
    } else {
      // Get contact_id
      const contactRes = await wtsRequest(
        wtsToken,
        "GET",
        `/core/v1/contact/phonenumber/${encodeURIComponent(log.customer_phone)}`,
      );
      if (contactRes.error) {
        errors.card = { ok: false, status: contactRes.status, error: `resolve_contact:${contactRes.error}` };
      } else {
        const contactId: string | undefined = contactRes.data?.id;
        if (!contactId) {
          errors.card = { ok: false, error: "contact_not_found" };
        } else {
          // Look up existing card
          const cardsRes = await wtsRequest(
            wtsToken,
            "GET",
            `/crm/v1/panel/card?PanelId=${panelId}&ContactId=${contactId}&PageSize=5`,
          );
          const items: any[] = cardsRes.data?.items || cardsRes.data || [];
          const existingCardId: string | undefined = items?.[0]?.id;

          if (existingCardId) {
            // MOVE
            const moveRes = await wtsRequest(
              wtsToken,
              "PUT",
              `/crm/v2/panel/card/${existingCardId}`,
              { stepId },
            );
            if (moveRes.error) {
              errors.card = { ok: false, status: moveRes.status, error: `move:${moveRes.error}` };
              updates.card_action = "failed";
            } else {
              errors.card = { ok: true, details: { action: "moved", card_id: existingCardId } };
              updates.wts_card_moved_at = ts();
              updates.card_action = "moved";
              updates.card_id_used = existingCardId;
            }
          } else {
            // CREATE
            const createRes = await wtsRequest(
              wtsToken,
              "POST",
              `/crm/v1/panel/card`,
              { panelId, stepId, contactId },
            );
            if (createRes.error) {
              errors.card = { ok: false, status: createRes.status, error: `create:${createRes.error}` };
              updates.card_action = "failed";
            } else {
              const newCardId = createRes.data?.id;
              errors.card = { ok: true, details: { action: "created", card_id: newCardId } };
              updates.wts_card_moved_at = ts();
              updates.card_action = "created";
              updates.card_id_used = newCardId ?? null;
            }
          }
        }
      }
    }
  }

  // -------- Action 3: Send message --------
  if (wantsMessage) {
    if (!log.customer_phone) {
      errors.send_message = { ok: false, error: "customer_phone_missing" };
    } else {
      const fromNumber = WHATSAPP_FROM_BY_CLIENT[log.client_handle];
      if (!fromNumber) {
        errors.send_message = { ok: false, error: `whatsapp_from_not_configured:${log.client_handle}` };
      } else {
        const sendRes = await wtsRequest(
          wtsToken,
          "POST",
          `/chat/v1/message/send`,
          {
            body: { text: messageText },
            to: normalizePhoneToBR(log.customer_phone),
            from: fromNumber,
          },
        );
        if (sendRes.error) errors.send_message = { ok: false, status: sendRes.status, error: sendRes.error };
        else { errors.send_message = { ok: true }; updates.wts_message_sent_at = ts(); }
      }
    }
  }

  // -------- Final status --------
  const requestedActions: Array<"apply_tag" | "card" | "send_message"> = [];
  if (wantsTag) requestedActions.push("apply_tag");
  if (wantsCard) requestedActions.push("card");
  if (wantsMessage) requestedActions.push("send_message");

  const allOk = requestedActions.every((k) => errors[k]?.ok);
  const anyOk = requestedActions.some((k) => errors[k]?.ok);
  updates.action_status = allOk ? "executed" : (anyOk ? "executed" : "failed");
  updates.wts_errors = errors;

  const { error: updErr } = await sb
    .from("wts_auto_followup_log")
    .update(updates)
    .eq("id", log.id);

  if (updErr) {
    return json(500, { error: "log_update_failed", details: updErr.message, partial_result: errors });
  }

  return json(200, {
    status: updates.action_status,
    log_id: log.id,
    action_type: actionType,
    actions: errors,
  });
});
