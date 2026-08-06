import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/shared/api/http';
import { tokenStore } from '@/shared/api/token-store';
import type { AuthResponse, Role } from '@/entities/types';

type AuthUser = AuthResponse['user'];

type AuthContextValue = {
  user: AuthUser | null;
  /** True until the initial refresh settles — routes must wait for it. */
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (response: AuthResponse) => void;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const setSession = useCallback((response: AuthResponse) => {
    tokenStore.set(response.accessToken);
    setUser(response.user);
  }, []);

  /**
   * The access token lives in memory, so a reload always starts logged out until
   * this call comes back. Rendering routes before it settles would flash the login
   * screen for an authenticated user.
   */
  useEffect(() => {
    let cancelled = false;

    api
      .refresh()
      .then(response => {
        if (!cancelled) setSession(response as AuthResponse);
      })
      .catch(() => {
        if (!cancelled) tokenStore.clear();
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      setSession(response);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // A failed logout still has to clear the local session.
      if (!(error instanceof ApiError)) throw error;
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const response = (await api.refresh()) as AuthResponse;
    setSession(response);
  }, [setSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      login,
      logout,
      setSession,
      refreshUser,
      hasRole: (...roles: Role[]) => Boolean(user && roles.includes(user.role)),
    }),
    [user, isBootstrapping, login, logout, setSession, refreshUser],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');

  return context;
};
