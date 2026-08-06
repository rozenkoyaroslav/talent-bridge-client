/**
 * The access token lives in memory only.
 *
 * Putting it in localStorage would hand it to any XSS on the page; losing it on
 * reload costs one silent `/auth/refresh` call, since the refresh token is an
 * httpOnly cookie the client never sees.
 */
let accessToken: string | null = null;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export const tokenStore = {
  get: () => accessToken,

  set(token: string | null) {
    accessToken = token;
    listeners.forEach(listener => listener(token));
  },

  clear() {
    tokenStore.set(null);
  },

  /** The chat socket authenticates during its handshake, so it re-subscribes here. */
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
