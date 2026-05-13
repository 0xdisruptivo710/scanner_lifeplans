-- ============================================================
-- RLS policies: liberar SELECT/UPDATE para authenticated role
-- (Lovable embedado no AIOS, com user logado via Supabase Auth)
-- ============================================================
-- service_role já tem bypass total (Edge Function continua funcionando).
-- anon role NÃO recebe acesso (queries sem JWT permanecem bloqueadas).

-- wts_auto_followup_log: read + update por authenticated
DROP POLICY IF EXISTS "authenticated read followup log" ON wts_auto_followup_log;
CREATE POLICY "authenticated read followup log"
  ON wts_auto_followup_log FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated update followup log" ON wts_auto_followup_log;
CREATE POLICY "authenticated update followup log"
  ON wts_auto_followup_log FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- wts_auto_followup_runs: read por authenticated (sem update necessário)
DROP POLICY IF EXISTS "authenticated read followup runs" ON wts_auto_followup_runs;
CREATE POLICY "authenticated read followup runs"
  ON wts_auto_followup_runs FOR SELECT
  TO authenticated
  USING (true);

-- wts_panel_mapping: read por authenticated (Lovable pode mostrar etapas válidas no dropdown)
DROP POLICY IF EXISTS "authenticated read panel mapping" ON wts_panel_mapping;
CREATE POLICY "authenticated read panel mapping"
  ON wts_panel_mapping FOR SELECT
  TO authenticated
  USING (true);

-- Habilitar realtime nas tabelas (Supabase precisa disso explicitamente)
ALTER PUBLICATION supabase_realtime ADD TABLE wts_auto_followup_log;
