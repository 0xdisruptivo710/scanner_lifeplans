-- wts_auto_followup_log: 1 linha por sessão processada
CREATE TABLE IF NOT EXISTS wts_auto_followup_log (
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

CREATE INDEX IF NOT EXISTS idx_fu_log_session
  ON wts_auto_followup_log (client_handle, session_id, classified_at DESC);
CREATE INDEX IF NOT EXISTS idx_fu_log_mode_date
  ON wts_auto_followup_log (client_handle, mode, classified_at DESC);

-- wts_auto_followup_runs: 1 linha-resumo por execução do workflow pai
CREATE TABLE IF NOT EXISTS wts_auto_followup_runs (
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

-- RLS: service_role-only (padrão do projeto)
ALTER TABLE wts_auto_followup_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE wts_auto_followup_runs ENABLE ROW LEVEL SECURITY;
