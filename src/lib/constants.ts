export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://ehlpmukjdknnyhkycncb.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// Todas as chamadas WTS passam por /api/wts/* (Vercel Function proxy) para evitar CORS
// e manter o token server-side. Em dev local sem `vercel dev`, esse path não responde.
export const WTS_BASE = '/api/wts';
export const WTS_TOKEN = ''; // token vive no servidor (env WTS_TOKEN_LIFE_PLANS)
export const WHATSAPP_FROM = '551541412625';
export const CLIENT_HANDLE = 'life-plans';

// Painel ATIVO "Pipeline Comercial" (chave PC) — destino real de movimentações/criações
// de card. O painel antigo "PipeLine Saúde [IA]" (56951001-…) foi DESATIVADO em jun/2026.
// Obs.: no wts_panel_mapping o panel_name continua 'PipeLine Saúde [IA]' (alias que casa
// com o column_applied gravado pelo N8N); só o panel_id/step_id apontam pro painel novo.
export const DEFAULT_PANEL_ID = '1055f96d-fa55-49a8-82f9-29dee1948a2a';

// Life Plans compartilha o projeto Supabase mas isola seus dados em tabelas
// específicas. wts_panel_mapping é compartilhado (sem sufixo) e filtrado por client_handle.
export const TABLE_AUTO_FOLLOWUP_LOG = 'wts_auto_followups_logs_lifeplans';
export const TABLE_PANEL_MAPPING = 'wts_panel_mapping';
export const TABLE_FOLLOWUP_RUNS = 'wts_auto_followups_runs_life';

export const WTS_RATE_LIMIT_MS = 700;
export const BULK_CONCURRENCY = 5;

// ── Responsável (atendente) ──────────────────────────────────────────────
// O scanner grava responsible_user_id (uid WTS) em cada sugestão, mas nem sempre
// resolve o nome (responsible_user_name fica nulo). Este mapa garante o nome de
// exibição no filtro do inbox. Plugar novos atendentes aqui quando o uid aparecer.
export const RESPONSIBLE_NAMES: Record<string, string> = {
  'f6f4d635-d9ab-47e0-96fa-2c0a041770b9': 'Andre Luiz',
  '7a2cf6ae-82b5-4bad-9cec-d0fd992d4318': 'Claudia Rodrigues',
  'e22b9c9c-5806-463f-a5fe-10362282e4f8': 'Thays',
  // '<uid-da-aliny>': 'Aliny',  // funcionária nova — adicionar quando o scanner capturar o uid
};

// uids que NUNCA entram no dropdown nem na visão "Todos" (gerência / bot / ex).
export const HIDDEN_RESPONSIBLE_IDS = new Set<string>([
  '26152132-b1d4-4318-b52f-e726188c5a3f', // Roberta Martins (saiu)
  '10b6634a-c3dc-4083-af23-f36ff009b887', // Solange Silva (saiu)
  '00000000-0000-0000-0000-000000000000', // bot / sistema
  // '<uid-da-patricia>',                  // gerência (não atende) — confirmar uid
]);

// Operadores que aprovam sugestões = roster de atendentes ativos (fonte única
// acima). Usado no filtro "Operador" e como autor (actioned_by) na aprovação.
export const OPERATORS: string[] = Object.values(RESPONSIBLE_NAMES);
export const DEFAULT_OPERATOR = OPERATORS[0] ?? '';

export const MSG_MIN = 40;
export const MSG_MAX = 600;
export const BANNED_PHRASES = [
  'aproveite',
  'última chance',
  'desconto especial',
  'oferta imperdível',
  'corra',
] as const;

export type ScenarioKey =
  | 'orcamento_sem_resposta'
  | 'pergunta_sem_resposta'
  | 'agendamento_incompleto'
  | 'interesse_silencio'
  | 'tag_only_no_engagement'
  | 'tag_only_atendimento_ativo'
  | 'tag_only_negocio_fechado'
  | 'tag_only_generic';

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  orcamento_sem_resposta: 'Orçamento sem resposta',
  pergunta_sem_resposta: 'Pergunta sem resposta',
  agendamento_incompleto: 'Agendamento incompleto',
  interesse_silencio: 'Interesse + silêncio',
  tag_only_no_engagement: 'Sem engajamento',
  tag_only_atendimento_ativo: 'Atendimento ativo',
  tag_only_negocio_fechado: 'Negócio fechado',
  tag_only_generic: 'Genérico',
};

// AIOS soft palette — paired with the Badge primary/neutral/success/info/danger/warning variants.
export const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  orcamento_sem_resposta:     'bg-warning-soft text-[#92400E]',
  pergunta_sem_resposta:      'bg-[#FFEDD5] text-[#9A3412]',
  agendamento_incompleto:     'bg-info-soft text-info/90',
  interesse_silencio:         'bg-primary-soft text-primary-soft-foreground',
  tag_only_no_engagement:     'bg-muted text-muted-foreground',
  tag_only_atendimento_ativo: 'bg-success-soft text-success/90',
  tag_only_negocio_fechado:   'bg-success-soft text-success',
  tag_only_generic:           'bg-muted text-muted-foreground',
};
