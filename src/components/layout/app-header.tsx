import { CheckCheck, Circle, Inbox, RefreshCw } from 'lucide-react';
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
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
        <Link to="/" className="flex items-center gap-2 focus-ring rounded-md">
          <div className="grid h-7 w-7 place-items-center rounded-md border border-border bg-card">
            <span className="font-mono text-[11px] font-medium tracking-tight">AI</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-medium tracking-tight">AIOS Inteligence</h1>
            <span className="font-mono text-[10px] text-muted-foreground">itupeva</span>
          </div>
        </Link>

        <nav className="ml-4 flex items-center gap-1">
          <Link to="/">
            {({ isActive }) => (
              <Button
                variant="ghost"
                size="sm"
                className={cn(isActive && 'bg-muted/60 text-foreground')}
              >
                <Inbox className="h-3.5 w-3.5" /> Caixa de Sugestões
              </Button>
            )}
          </Link>
          <Link to="/historico">
            {({ isActive }) => (
              <Button
                variant="ghost"
                size="sm"
                className={cn(isActive && 'bg-muted/60 text-foreground')}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Ações Aprovadas
              </Button>
            )}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Circle
              className={cn(
                'h-2 w-2 fill-current',
                live ? 'text-emerald-400' : 'text-muted-foreground',
                live && 'animate-pulse',
              )}
            />
            <span className={cn('font-mono', live ? 'text-emerald-300' : 'text-muted-foreground')}>
              {live ? 'live' : realtimeStatus.toLowerCase()}
            </span>
          </div>

          <Select value={operator} onValueChange={(v) => setOperator(v as Operator)}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Murilo">Murilo</SelectItem>
              <SelectItem value="Lucas">Lucas</SelectItem>
            </SelectContent>
          </Select>

          {path === '/' && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Atualizar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
