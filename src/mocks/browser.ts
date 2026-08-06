import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export const IS_MOCK_MODE = (import.meta.env.VITE_API_MODE ?? 'mock') === 'mock';

export const startMocks = async () => {
  if (!IS_MOCK_MODE) return;

  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
};
