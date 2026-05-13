export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://ehlpmukjdknnyhkycncb.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// Todas as chamadas WTS passam por /api/wts/* (Vercel Function proxy) para evitar CORS
// e manter o token server-side. Em dev local sem `vercel dev`, esse path não responde.
export const WTS_BASE = '/api/wts';
export const WTS_TOKEN = ''; // token vive no servidor (env WTS_TOKEN_ITUPEVA)
export const WHATSAPP_FROM = '5511913352918';
export const CLIENT_HANDLE = 'itupeva';

export const DEFAULT_PANEL_ID = '82b8ab1a-6945-4e63-a098-a7cf85a831cd';

export const WTS_RATE_LIMIT_MS = 700;
export const BULK_CONCURRENCY = 5;

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

export const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  orcamento_sem_resposta:     'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
  pergunta_sem_resposta:      'border-orange-500/30 bg-orange-500/10 text-orange-200',
  agendamento_incompleto:     'border-blue-500/30 bg-blue-500/10 text-blue-200',
  interesse_silencio:         'border-purple-500/30 bg-purple-500/10 text-purple-200',
  tag_only_no_engagement:     'border-zinc-500/30 bg-zinc-500/10 text-zinc-300',
  tag_only_atendimento_ativo: 'border-green-500/30 bg-green-500/10 text-green-200',
  tag_only_negocio_fechado:   'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  tag_only_generic:           'border-zinc-500/30 bg-zinc-500/10 text-zinc-300',
};
