import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Providers } from './app/providers';
import { AppRouter } from './app/router';
import { startMocks } from './mocks/browser';

// Mocks must be intercepting before the first request leaves the app, otherwise the
// initial session refresh would escape to a backend that is not there.
void startMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers>
        <AppRouter />
      </Providers>
    </StrictMode>,
  );
});
