# TalentBridge — client

**[Live demo](https://rozenkoyaroslav.github.io/talent-bridge-client/)** — sign in with one
click as a student, an employer or an admin.

Frontend for [talent-bridge-api](https://github.com/rozenkoyaroslav/talent-bridge-api): a
platform where students and graduates find internships and jobs, employers search
candidates and book them, and admins moderate both sides.

Covers all three roles and every endpoint the API exposes — 68 of them.

**React 19 · TypeScript · Vite · TanStack Query · React Router · MSW · Tailwind · Recharts**

> **The demo runs entirely on mocks.** No backend is involved: MSW intercepts every
> request in the browser and answers from an in-memory database seeded with fixed
> data. The mocks reproduce the API contract one to one — the same client code also
> runs against the real API in `live` mode — but a working demo is not evidence of a
> deployed backend, and this page does not pretend otherwise.

## Run it

```bash
npm install
npm run dev          # demo mode, mocks on, nothing else required
```

Sign in with one of the demo accounts (or the buttons on the login screen):

| Role | Email | Password |
|---|---|---|
| Student | `student@demo.io` | `demo` |
| Employer | `employer@demo.io` | `demo` |
| Admin | `admin@demo.io` | `demo` |

Against the real API instead:

```bash
cp .env.example .env      # set VITE_API_MODE=live
npm run dev
```

## What to look at

| Concern | Where |
|---|---|
| **Hybrid auth.** The access token is held in memory (never `localStorage`); the refresh token is an httpOnly cookie the client never reads. A reload restores the session with one silent refresh, and a 401 queues the failed request behind a single deduplicated refresh before retrying. | [http.ts](src/shared/api/http.ts), [token-store.ts](src/shared/api/token-store.ts), [auth-context.tsx](src/features/auth/auth-context.tsx) |
| **One list layer for every screen.** The API takes `filters`/`sorting`/`pagination` as JSON strings and names its result array after the resource. Both are normalised once, so candidate search, vacancies, bookings, users and notifications share the same paging, skeletons and empty states. | [query-params.ts](src/shared/api/query-params.ts), [paginated.ts](src/shared/api/paginated.ts), [list-shell.tsx](src/shared/ui/list-shell.tsx) |
| **Candidate search.** Every filter the API supports, including the age range that maps to dates of birth and the years-of-experience filter that resolves to a set of ids. Cards show the average practice grade the API computes per request. | [candidates.tsx](src/pages/candidates.tsx), [api.ts](src/features/candidates/api.ts) |
| **Real-time chat.** Socket.IO is not HTTP, so MSW cannot intercept it — the socket sits behind one interface and the demo swaps in an emulator with the same surface. The connection is rebuilt when the access token changes, because the API authenticates during the handshake. | [socket.ts](src/features/chat/socket.ts), [chat.tsx](src/pages/chat.tsx) |
| **Uploads with progress.** `fetch` cannot report upload progress, so files go through XHR; size is checked before sending rather than after a 100 MB round trip. | [profile/api.ts](src/features/profile/api.ts) |
| **Practices.** The two-sided start/end handshake, shown as whose confirmation is still missing rather than a bare "pending". | [practices.tsx](src/pages/practices.tsx) |
| **Notification wording.** Eleven notification types phrased in one table instead of a switch inside a component. | [templates.ts](src/features/notifications/templates.ts) |
| **The mocks themselves.** Filtering, sorting and paging are computed for real against the in-memory database, so the part of the UI worth demonstrating actually works. | [mocks/](src/mocks/) |

## Demo behaviour

- **Deterministic seed** — the same 40 students, 12 employers, 25 vacancies, bookings,
  graded practices, chats and notifications on every visit.
- **Mutations persist** in `sessionStorage`: approve a vacancy and it leaves the queue,
  reload and it stays gone; the next visitor still gets a clean demo. "Reset demo data"
  in the banner restores it immediately.
- **Uploads** are read into an object URL and stored in the mock database, with the
  progress bar driven step by step.
- **One endpoint fails on purpose** — the video interview upload rejects roughly one
  request in three, so error handling is visible rather than claimed.
- **Latency is simulated** at 150–400 ms so skeletons and pending states are real.

## Deployment

The demo is a static bundle: `npm run build:pages` produces one, and
[deploy.yml](.github/workflows/deploy.yml) publishes it to GitHub Pages on every push
to `main`. A project site lives under `/<repo>/`, so the workflow passes that path as
`VITE_BASE`, the router takes its `basename` from it, and the build copies
`index.html` to `404.html` — Pages has no server-side routing, and without that
fallback a deep link like `/candidates` would 404 instead of reaching the router.

## Commands

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm test           # unit tests
npm run preview    # serve the built demo on :4173
npm run e2e        # drive the built demo in a real browser
```

Unit tests cover the parts that are easy to get quietly wrong: filter serialisation,
the no-op filter the API's `@IsNotEmpty` validation forces, response normalisation,
the `FILE::` attachment protocol and every notification wording.

The end-to-end script signs in as all three roles and checks that the age filter
actually narrows the result set, that a sent chat message is answered, that analytics
render and that the moderation queue offers its actions.

## License

MIT
