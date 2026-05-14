import { Outlet, createRootRoute, useRouter } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { AppHeader } from '@/components/layout/app-header';
import { useRealtime } from '@/hooks/use-realtime';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';

function RootLayout() {
  useRealtime(); // keep the realtime subscription warm even with no UI indicator
  const router = useRouter();
  const qc = useQueryClient();
  const fetching =
    useIsFetching({ queryKey: ['suggestions'] }) +
      useIsFetching({ queryKey: ['history'] }) >
    0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader
        isFetching={fetching}
        onRefresh={() => {
          qc.invalidateQueries({ queryKey: ['suggestions'] });
          qc.invalidateQueries({ queryKey: ['history'] });
          router.invalidate();
        }}
      />
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <Outlet />
      </main>
      <Toaster
        theme="light"
        richColors
        position="bottom-right"
        toastOptions={{
          className: 'font-sans',
          style: { borderRadius: '12px' },
        }}
      />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
