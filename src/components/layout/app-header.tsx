import { CheckCheck, Inbox, RefreshCw } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Caixa de Sugestões', icon: Inbox },
  { to: '/historico', label: 'Ações Aprovadas', icon: CheckCheck },
] as const;

export function AppHeader({
  isFetching,
  onRefresh,
}: {
  isFetching?: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-6">
        <nav className="flex items-center gap-1">
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

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="ml-auto h-8"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Atualizar
        </Button>
      </div>
    </header>
  );
}
