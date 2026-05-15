-- ============================================================
-- Macaé bootstrap — cria/garante o schema das tabelas com sufixo
-- _macae no MESMO projeto Supabase usado pelo Itupeva.
-- ============================================================
-- Decisão arquitetural (2026-05-14): este cliente Macaé compartilha
-- o projeto Supabase do Itupeva, mas isola seus dados em tabelas
-- sufixadas. Mantém o mesmo schema das 6 migrations canônicas,
-- só muda os nomes. Idempotente (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Se o usuário já criou as tabelas manualmente, esta migration apenas
-- preenche o que estiver faltando.

-- ============================================================
-- 1) wts_auto_followup_log_macae
-- ============================================================
CREATE TABLE IF NOT EXISTS wts_auto_followup_log_macae (
  id                  bigserial PRIMARY KEY,
  client_handle       text NOT NULL,
  session_id          text NOT NULL,
  customer_phone      text,
  classified_at       timestamptz NOT NULL DEFAULT now(),
  mode                text NOT NULL CHECK (mode IN
                        ('shadow','executed','skipped_not_fu',
                         'skipped_low_conf','skipped_cooldown','error')),
  is_followup         boolean,
  confidence          numeric(3,2),
  tag_applied         text,
  column_applied      text,
  message_sent        text,
  reasoning_short     text,
  scenario            text,
  error_reason        text,
  raw_classifier_json jsonb,
  raw_session_meta    jsonb,
  human_verdict       text CHECK (human_verdict IN ('approve','reject') OR human_verdict IS NULL)
);

ALTER TABLE wts_auto_followup_log_macae
  ADD COLUMN IF NOT EXISTS action_status text
    CHECK (action_status IN ('pending','approved','rejected','expired','executed','failed') OR action_status IS NULL),
  ADD COLUMN IF NOT EXISTS human_message_override text,
  ADD COLUMN IF NOT EXISTS actioned_by text,
  ADD COLUMN IF NOT EXISTS actioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS wts_tag_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS wts_card_moved_at timestamptz,
  ADD COLUMN IF NOT EXISTS wts_message_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS wts_errors jsonb,
  ADD COLUMN IF NOT EXISTS suggest_message boolean,
  ADD COLUMN IF NOT EXISTS card_action text
    CHECK (card_action IN ('moved','created','skipped','failed') OR card_action IS NULL),
  ADD COLUMN IF NOT EXISTS card_id_used text,
  ADD COLUMN IF NOT EXISTS customer_name text;

CREATE INDEX IF NOT EXISTS idx_fu_log_macae_session
  ON wts_auto_followup_log_macae (client_handle, session_id, classified_at DESC);
CREATE INDEX IF NOT EXISTS idx_fu_log_macae_mode_date
  ON wts_auto_followup_log_macae (client_handle, mode, classified_at DESC);
CREATE INDEX IF NOT EXISTS idx_fu_log_macae_action_status
  ON wts_auto_followup_log_macae (client_handle, action_status, classified_at DESC)
  WHERE action_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fu_log_macae_suggest_pending
  ON wts_auto_followup_log_macae (client_handle, suggest_message, action_status, classified_at DESC)
  WHERE action_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_fu_log_macae_customer_name
  ON wts_auto_followup_log_macae (customer_name) WHERE customer_name IS NOT NULL;

-- ============================================================
-- 2) wts_auto_followup_runs_macae
-- ============================================================
CREATE TABLE IF NOT EXISTS wts_auto_followup_runs_macae (
  id               bigserial PRIMARY KEY,
  client_handle    text NOT NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  shadow_mode      boolean NOT NULL,
  sessions_scanned int,
  fu_executed      int,
  fu_shadow        int,
  skipped_total    int,
  errors_total     int,
  notes            text
);

-- ============================================================
-- 3) wts_panel_mapping_macae
-- ============================================================
CREATE TABLE IF NOT EXISTS wts_panel_mapping_macae (
  id              bigserial PRIMARY KEY,
  client_handle   text NOT NULL,
  panel_id        text NOT NULL,
  panel_name      text NOT NULL,
  step_id         text NOT NULL,
  step_name       text NOT NULL,
  composite_key   text NOT NULL GENERATED ALWAYS AS (panel_name || ' > ' || step_name) STORED,
  refreshed_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_handle, panel_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_panel_mapping_macae_lookup
  ON wts_panel_mapping_macae (client_handle, composite_key);

-- ============================================================
-- 4) RLS — mesmo tradeoff do Itupeva: desligada nas duas tabelas
-- lidas pelo app (embed no Aios, URL não compartilhada).
-- ============================================================
ALTER TABLE wts_auto_followup_log_macae DISABLE ROW LEVEL SECURITY;
ALTER TABLE wts_panel_mapping_macae DISABLE ROW LEVEL SECURITY;
ALTER TABLE wts_auto_followup_runs_macae ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE wts_auto_followup_log_macae IS
  'RLS desligada — app embedado no Aios (URL não compartilhada). Espelho do wts_auto_followup_log do Itupeva, isolado por cliente.';
COMMENT ON TABLE wts_panel_mapping_macae IS
  'RLS desligada — leitura pública via anon key (mapping não é sensível).';
COMMENT ON COLUMN wts_auto_followup_log_macae.suggest_message IS
  'IA sugere envio de mensagem FU? false = só tag/move card, true = também envia msg';
COMMENT ON COLUMN wts_auto_followup_log_macae.is_followup IS
  'DEPRECATED — mantido para compat. Use suggest_message.';
COMMENT ON COLUMN wts_auto_followup_log_macae.card_action IS
  'O que a Edge Function fez com o card: moved (já existia), created (não existia), skipped, failed';
COMMENT ON COLUMN wts_auto_followup_log_macae.card_id_used IS
  'card_id WTS que foi movido/criado';
COMMENT ON COLUMN wts_auto_followup_log_macae.customer_name IS
  'Nome do cliente final (session.title do WTS, ou contactDetails.name)';

-- ============================================================
-- 5) Realtime — publicar a tabela do Macaé
-- ============================================================
-- Se o publication já tiver a tabela, este ALTER falha. Por isso o DO block.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wts_auto_followup_log_macae;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    -- Em ambientes onde a publication não existe ou o user não tem permissão,
    -- não derruba a migration inteira — só registra.
    RAISE NOTICE 'Não foi possível adicionar wts_auto_followup_log_macae à publication supabase_realtime: %', SQLERRM;
END $$;
