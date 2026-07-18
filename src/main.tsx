import { MetricTracker } from './lib/instrumentation';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { FirebaseProvider } from './components/FirebaseProvider.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent aggressive and redundant refetching on window focus
      refetchOnReconnect: false,   // Disable refetch on internet reconnection
      staleTime: 1000 * 60 * 15,    // Default staleTime of 15 minutes
      gcTime: 1000 * 60 * 30,       // Keep unused cache for 30 minutes
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <FirebaseProvider>
        <App />
      </FirebaseProvider>
    </QueryClientProvider>
  </StrictMode>,
);

if (process.env.NODE_ENV === 'development') {
  (window as any).__FirestoreMetrics__ = MetricTracker;
}
