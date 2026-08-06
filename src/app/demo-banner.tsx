import { useState } from 'react';
import { IS_MOCK_MODE } from '@/mocks/browser';

const REPO_URL = 'https://github.com/rozenkoyaroslav/talent-bridge-api';

/**
 * Without this, a reviewer cannot tell whether they are looking at a deployed
 * backend or a fixture — so the demo says so plainly, and offers a way back to a
 * clean state after they have changed things.
 */
export const DemoBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  if (!IS_MOCK_MODE || dismissed) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-slate-900 px-4 py-2 text-center text-xs text-slate-200">
      <span>
        <strong className="font-semibold text-white">Demo mode</strong> — data is fictional and
        served in-browser; no backend is involved.
      </span>
      <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline hover:text-white">
        API repository
      </a>
      <button
        type="button"
        className="underline hover:text-white"
        onClick={async () => {
          const { resetDb } = await import('@/mocks/db');
          resetDb();
          sessionStorage.removeItem('talent-bridge-demo-session');
          window.location.href = '/login';
        }}
      >
        Reset demo data
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        className="ml-1 text-slate-400 hover:text-white"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
    </div>
  );
};
