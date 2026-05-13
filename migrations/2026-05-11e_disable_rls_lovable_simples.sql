-- Disable RLS nas 2 tabelas que o Lovable usa.
-- Tradeoff aceito pelo usuário: app é embedado no AIOS, URL não é compartilhada.
-- Se URL + anon key vazarem juntos, dados ficam acessíveis. Risco assumido.

ALTER TABLE wts_auto_followup_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE wts_panel_mapping DISABLE ROW LEVEL SECURITY;

-- wts_auto_followup_runs (admin/audit) MANTÉM RLS — Lovable não lê isso.
-- _secrets MANTÉM RLS — Edge Function vai descontinuada, mas tabela fica.

COMMENT ON TABLE wts_auto_followup_log IS 'RLS desligada — app Lovable interno (AIOS-only). Reativar se URL for compartilhada externamente.';
COMMENT ON TABLE wts_panel_mapping IS 'RLS desligada — leitura pública via anon key (mapping não é sensível).';
