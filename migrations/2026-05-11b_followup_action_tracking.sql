-- 1) Extend wts_auto_followup_log with action tracking columns

ALTER TABLE wts_auto_followup_log
  ADD COLUMN IF NOT EXISTS action_status text
    CHECK (action_status IN ('pending','approved','rejected','expired','executed','failed') OR action_status IS NULL),
  ADD COLUMN IF NOT EXISTS human_message_override text,
  ADD COLUMN IF NOT EXISTS actioned_by text,
  ADD COLUMN IF NOT EXISTS actioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS wts_tag_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS wts_card_moved_at timestamptz,
  ADD COLUMN IF NOT EXISTS wts_message_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS wts_errors jsonb;

CREATE INDEX IF NOT EXISTS idx_fu_log_action_status
  ON wts_auto_followup_log (client_handle, action_status, classified_at DESC)
  WHERE action_status IS NOT NULL;

-- Backfill: every row with is_followup=true gets action_status='pending'
UPDATE wts_auto_followup_log
SET action_status = 'pending'
WHERE is_followup = true
  AND action_status IS NULL
  AND mode IN ('shadow','executed');

-- 2) Create wts_panel_mapping (cached panel→step lookup)

CREATE TABLE IF NOT EXISTS wts_panel_mapping (
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

CREATE INDEX IF NOT EXISTS idx_panel_mapping_lookup
  ON wts_panel_mapping (client_handle, composite_key);

ALTER TABLE wts_panel_mapping ENABLE ROW LEVEL SECURITY;
