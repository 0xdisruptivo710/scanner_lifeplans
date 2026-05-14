import { Component, type ReactNode } from 'react';

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AIOS] runtime error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background text-foreground p-8 font-mono text-sm">
          <h1 className="mb-3 text-base font-medium">AIOS Inteligence — erro de runtime</h1>
          <pre className="overflow-auto rounded-md border border-border bg-destructive-soft p-4 text-destructive">
            {this.state.error.name}: {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <p className="mt-4 text-muted-foreground">
            Recarregue. Se persistir, mande o stack acima.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
