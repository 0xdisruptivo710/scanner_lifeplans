import { CheckCheck, Inbox, RefreshCw } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOperator } from '@/hooks/use-operator';
import type { Operator, RealtimeStatus } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NAV = [
  { to: '/', label: 'Caixa de Sugestões', icon: Inbox },
  { to: '/historico', label: 'Ações Aprovadas', icon: CheckCheck },
] as const;

export function AppHeader({
  realtimeStatus,
  isFetching,
  onRefresh,
}: {
  realtimeStatus: RealtimeStatus;
  isFetching?: boolean;
  onRefresh: () => void;
}) {
  const { operator, setOperator } = useOperator();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const live = realtimeStatus === 'SUBSCRIBED';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
        {/* Logo */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-md focus-ring"
          aria-label="AIOS Inteligence"
        >
          <span
            className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]"
            aria-hidden
          >
            <span className="text-[11px] font-semibold tracking-tight">a</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-medium tracking-[-0.01em] text-foreground">
              Aios <span className="text-muted-foreground">Inteligence</span>
            </span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
              itupeva
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="ml-2 flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              {({ isActive }) => (
                <span
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-primary-soft text-primary-soft-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-3">
          <LiveIndicator live={live} label={realtimeStatus.toLowerCase()} />

          <div className="h-5 w-px bg-border" aria-hidden />

          <Select value={operator} onValueChange={(v) => setOperator(v as Operator)}>
            <SelectTrigger className="h-8 w-[120px] rounded-full border-border bg-surface px-3 text-[12.5px]">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Murilo">Murilo</SelectItem>
              <SelectItem value="Lucas">Lucas</SelectItem>
            </SelectContent>
          </Select>

          {path === '/' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              className="h-8"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Atualizar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function LiveIndicator({ live, label }: { live: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none transition-colors',
        live
          ? 'bg-success-soft text-success/90'
          : 'bg-muted text-muted-foreground',
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex h-1.5 w-1.5 rounded-full',
            live ? 'bg-success' : 'bg-muted-foreground/50',
          )}
        />
      </span>
      <span className="font-mono uppercase tracking-[0.04em]">
        {live ? 'live' : label}
      </span>
    </span>
  );
}
