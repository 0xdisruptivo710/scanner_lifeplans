import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/constants';

const missing: { name: string; ok: boolean }[] = [
  { name: 'VITE_SUPABASE_URL', ok: !!SUPABASE_URL },
  { name: 'VITE_SUPABASE_ANON_KEY', ok: !!SUPABASE_ANON_KEY },
];

export function EnvCheckGate({ children }: { children: React.ReactNode }) {
  const broken = missing.filter((v) => !v.ok);
  if (broken.length === 0) return <>{children}</>;
  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-mono text-sm">
      <h1 className="mb-3 text-base font-medium">Configuração incompleta</h1>
      <p className="mb-4 text-muted-foreground">
        As variáveis abaixo não estão chegando no client. Confira em Vercel → Settings →
        Environment Variables (escopo Production) e re-deploy.
      </p>
      <ul className="space-y-1">
        {missing.map((v) => (
          <li key={v.name} className="flex items-center gap-2">
            <span className={v.ok ? 'text-success' : 'text-destructive'}>
              {v.ok ? '✓' : '✗'}
            </span>
            <code>{v.name}</code>
            <span className="text-muted-foreground">
              {v.ok ? '' : '— ausente ou vazia'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
