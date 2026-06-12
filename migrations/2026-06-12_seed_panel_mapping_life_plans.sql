-- Seed wts_panel_mapping para life-plans.
--
-- Contexto: o painel "PipeLine Saúde [IA]" (56951001-…) foi DESATIVADO em jun/2026.
-- O painel ATIVO passou a ser "Pipeline Comercial" (1055f96d-…, chave PC).
--
-- IMPORTANTE: panel_name é mantido como 'PipeLine Saúde [IA]' de propósito — ele é a
-- CHAVE que casa com `column_applied` que o classificador (N8N) ainda grava
-- ("PipeLine Saúde [IA] > <etapa>") e com ALLOWED_PANEL no ColumnSelect. Só panel_id e
-- step_id apontam para o painel novo. composite_key é coluna GERADA
-- (panel_name || ' > ' || step_name), então NÃO é inserida aqui.
--
-- Re-runnable: limpa as linhas de life-plans antes de inserir.

begin;

delete from wts_panel_mapping where client_handle = 'life-plans';

insert into wts_panel_mapping (client_handle, panel_id, panel_name, step_id, step_name, refreshed_at) values
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', 'ed1f7aea-a2eb-47ff-8301-423370f990ed', 'Contato / Apresentação',            now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', 'ae82000e-680d-4666-afb2-edc1953d104f', 'Sem interação / Recuperação Saúde', now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', '9ecc1a18-6c31-43e2-a761-4072cb19de9e', 'Contrato',                          now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', 'a9676176-cc06-4818-8fbe-b0154fd2e259', 'Follow-Up',                         now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', '179efcb8-b57a-423e-b63a-b7766a808c11', 'Cotação / Negociação',              now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', 'cdcc152e-b33c-41ea-8333-c502f95e3818', 'Ajuda da Gerente',                  now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', 'cb908f10-688b-4040-a2cb-41936cadfb81', 'Aguardando a documentação',         now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', '9d7a6ded-d7e2-4407-91a7-ea8977444990', 'Enviado para a implantação',        now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', '30a7b685-46e0-4b00-bc9e-954442bf1f2f', 'Venda Concluida',                   now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', 'd054232b-6a99-44a6-b62d-06d89b04876c', 'Venda Perdida',                     now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', 'c9ab421c-1dab-41c0-a184-25de45bfa70f', 'Repescagem - Perdidos',             now()),
  ('life-plans', '1055f96d-fa55-49a8-82f9-29dee1948a2a', 'PipeLine Saúde [IA]', '28bae1f3-3af6-4b2a-b7e0-d5d97849c3bb', 'Venda Futura',                      now());

commit;
