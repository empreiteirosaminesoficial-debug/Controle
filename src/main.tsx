import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPWAUpdater } from './utils/pwaUpdater.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Inicializa o gerenciador de Service Worker e gatilhos de atualização do PWA
registerPWAUpdater();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
