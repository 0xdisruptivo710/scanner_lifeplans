-- ============================================================
-- Pivot: AIOS Inteligence — CRM organizer com IA (não só FU)
-- ============================================================
-- Cada sessão das últimas 24h vira uma sugestão de ação CRM.
-- IA sempre sugere tag + coluna; opcionalmente sugere mensagem FU.
-- Usuário aprova/rejeita via Lovable app embedado no AIOS.

-- 1) Novo flag: a IA sugere enviar mensagem? (substitui a semântica do is_followup)
ALTER TABLE wts_auto_followup_log
  ADD COLUMN IF NOT EXISTS suggest_message boolean;

-- Backfill: rows antigos com is_followup=true viram suggest_message=true
UPDATE wts_auto_followup_log
SET suggest_message = is_followup
WHERE suggest_message IS NULL AND is_followup IS NOT NULL;

-- 2) Tracking do que aconteceu com o card no kanban (move ou create)
ALTER TABLE wts_auto_followup_log
  ADD COLUMN IF NOT EXISTS card_action text
    CHECK (card_action IN ('moved','created','skipped','failed') OR card_action IS NULL),
  ADD COLUMN IF NOT EXISTS card_id_used text;

-- 3) Comments pra documentar o significado novo
COMMENT ON COLUMN wts_auto_followup_log.suggest_message IS
  'IA sugere envio de mensagem FU? false = só tag/move card (CRM organize), true = também envia msg';
COMMENT ON COLUMN wts_auto_followup_log.is_followup IS
  'DEPRECATED — mantido para compat. Use suggest_message. Vai sair em V2.';
COMMENT ON COLUMN wts_auto_followup_log.card_action IS
  'O que a Edge Function fez com o card: moved (já existia), created (não existia), skipped, failed';
COMMENT ON COLUMN wts_auto_followup_log.card_id_used IS
  'card_id WTS que foi movido/criado pela Edge Function';

-- 4) Index pra Lovable filtrar suggest_message rapidamente
CREATE INDEX IF NOT EXISTS idx_fu_log_suggest_pending
  ON wts_auto_followup_log (client_handle, suggest_message, action_status, classified_at DESC)
  WHERE action_status = 'pending';
