import { MetricTracker } from './lib/instrumentation';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { FirebaseProvider } from './components/FirebaseProvider.tsx';

const queryClient = new QueryClient();

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
