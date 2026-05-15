-- ============================================================
-- Seed wts_panel_mapping_macae — Painel Comercial (Face Doctor Macaé)
-- ============================================================
-- Extraído de api.wts.chat em 2026-05-14:
--   GET /crm/v1/panel?PageSize=50         → id do painel
--   GET /crm/v1/panel/<id>?IncludeDetails=Steps → 11 steps
--
-- panel_id  = 7fe38e2c-e582-469b-8e3e-0d37c7c06660 ("Painel Comercial")
-- companyId = 8331f274-9017-49e0-8bc5-cc8b39a7aeeb (Face Doctor Macaé)
--
-- IMPORTANTE: o step_name "recepção - Desmarcou Avaliação" está com
-- 'r' minúsculo na WTS (confirmado pelo usuário em 2026-05-14, e bate
-- com a resposta do endpoint). Manter exatamente assim — composite_key
-- depende disso.

INSERT INTO wts_panel_mapping_macae
  (client_handle, panel_id, panel_name, step_id, step_name)
VALUES
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   'bf2e16a4-0a16-44e8-906f-6c09bb8c76b1', 'Recepção - Novo Lead'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   '6f3a6cc8-0b02-41a4-9fd3-595e4a2ce4eb', 'Recepção - Atendimento Iniciado'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   '9a894897-0f25-409e-9d48-a62138021a03', 'D1'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   '4833adbf-741e-45eb-805e-42377b902705', 'D2'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   'f87a842d-59d7-4b33-aa5c-295847f24de4', 'D3'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   '52be1924-78cb-4993-8ad4-260ca7c6ec84', 'D4'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   'e68b1336-c6f1-40b3-b255-924384724df4', 'Recepção - Avaliação Agendada'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   '5b8920ca-4a80-43a0-9b71-e9d09d0bdd81', 'Resgate - Avaliação Realizada'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   '680f84da-bf8a-4609-a01e-e9a627e61ccf', 'recepção - Desmarcou Avaliação'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   'b448df30-56dd-48d3-b3f0-7c639e13b643', 'Resgate - Recuperação Geral'),
  ('macae', '7fe38e2c-e582-469b-8e3e-0d37c7c06660', 'Painel Comercial',
   'dbeea87f-b96c-49a2-ba6f-57ae61374352', 'Contatos profissionais')
ON CONFLICT (client_handle, panel_id, step_id) DO NOTHING;
