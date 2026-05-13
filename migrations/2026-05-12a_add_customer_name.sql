-- Adiciona customer_name na tabela de log de auto-followup
-- Aplicada via MCP em 2026-05-12; este arquivo versiona o schema.
ALTER TABLE wts_auto_followup_log
  ADD COLUMN IF NOT EXISTS customer_name text;

CREATE INDEX IF NOT EXISTS idx_fu_log_customer_name
  ON wts_auto_followup_log (customer_name) WHERE customer_name IS NOT NULL;

COMMENT ON COLUMN wts_auto_followup_log.customer_name IS
  'Nome do cliente final (session.title do WTS, ou contactDetails.name se IncludeDetails=Contact)';
