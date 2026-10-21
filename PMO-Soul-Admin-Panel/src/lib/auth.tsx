import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, TOKEN_KEY } from './api';

export interface AuthUser {
  userId: number;
  email: string;
  firstName?: string;
  lastName?: string;
  roleId?: number;
  permissions?: Record<string, Record<string, any>>;
  /** Tenant the principal belongs to (0 = platform sentinel). */
  organizationId?: number;
  /** Cross-tenant super admin — bypasses tenant scoping. */
  isPlatformAdmin?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /**
   * Finish a sign-in that did not involve a password — today, a one-time code.
   *
   * Exists so the code path shares this provider's single "a token means you are signed in" rule
   * instead of writing localStorage itself. POST /api/auth/verify-code returns exactly what
   * /api/auth/login returns, which is what makes one function enough.
   */
  signInWithToken: (accessToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Decode a JWT (no signature verification) — returns the raw claims. */
function parseJwt(token: string): Record<string, any> | null {
  try {
    const part = token.split('.')[1];
    return JSON.parse(
      decodeURIComponent(escape(atob(part.replace(/-/g, '+').replace(/_/g, '/'))))
    );
  } catch {
    return null;
  }
}

/** True when the token carries an exp claim that's already in the past. */
function isExpired(claims: Record<string, any> | null): boolean {
  return !!claims && typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now();
}

/** Extract the AuthUser from a valid (non-expired) token, else null. */
function userFromToken(token: string): AuthUser | null {
  const claims = parseJwt(token);
  if (!claims || isExpired(claims)) return null;
  return (claims.payload ?? claims) as AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only treat the user as logged in if a valid, unexpired token exists —
    // otherwise clear it so the app opens on the sign-in screen.
    const token = localStorage.getItem(TOKEN_KEY);
    const u = token ? userFromToken(token) : null;
    if (token && !u) localStorage.removeItem(TOKEN_KEY);
    setUser(u);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    const token = data.accessToken ?? data.token ?? data.access_token;
    if (!token) throw new Error('No access token returned');
    localStorage.setItem(TOKEN_KEY, token);
    setUser(userFromToken(token));
  };

  const signInWithToken = (accessToken: string) => {
    if (!accessToken) throw new Error('No access token returned');
    localStorage.setItem(TOKEN_KEY, accessToken);
    setUser(userFromToken(accessToken));
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loading, login, signInWithToken, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * PG-07 — can the signed-in user perform this operation?
 *
 * Reads the SAME permission map the backend guard enforces, so a button can never
 * be offered for something the API will refuse. Rendering affordances from one
 * source and authorising from another is the drift that let an endpoint ship with
 * no guard at all (G17).
 *
 *   useCan('Workflow', 'create')            // CRUD
 *   useCan('Workflow', 'action:activate')   // a named action
 */
export function useCan(entity: string, operation: string): boolean {
  const { user } = useAuth();
  const perms = user?.permissions?.[String(entity).toLowerCase()];
  if (!perms) return false;

  if (operation.startsWith('action:')) {
    return perms.actions?.[operation.slice('action:'.length)] === true;
  }

  const alias: Record<string, string> = {
    read: 'get',
    list: 'getAll',
    create: 'create',
    update: 'update',
    delete: 'delete',
  };
  const key = alias[operation] ?? operation;
  return perms[key] === true || perms[operation] === true;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Route guard — redirects to /login when unauthenticated. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
