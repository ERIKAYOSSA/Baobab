import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMe, type ApiPerson } from "@/lib/api";
import { PERSON_KEY, REFRESH_TOKEN_KEY, TOKEN_KEY, USE_MOCKS } from "@/lib/api/config";

type AuthContextValue = {
  token: string | null;
  person: ApiPerson | null;
  loading: boolean;
  useMocks: boolean;
  isAuthenticated: boolean;
  setSession: (token: string, person: ApiPerson, refreshToken?: string | null) => void;
  updateLocalPerson: (person: ApiPerson) => void;
  clearSession: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredPerson(): ApiPerson | null {
  try {
    const raw = localStorage.getItem(PERSON_KEY);
    return raw ? (JSON.parse(raw) as ApiPerson) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [person, setPerson] = useState<ApiPerson | null>(() => readStoredPerson());
  const [loading, setLoading] = useState(() => Boolean(token) && !USE_MOCKS);

  const setSession = useCallback(
    (nextToken: string, nextPerson: ApiPerson, refreshToken?: string | null) => {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(PERSON_KEY, JSON.stringify(nextPerson));
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      setToken(nextToken);
      setPerson(nextPerson);
    },
    [],
  );

  const updateLocalPerson = useCallback((nextPerson: ApiPerson) => {
    localStorage.setItem(PERSON_KEY, JSON.stringify(nextPerson));
    setPerson(nextPerson);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(PERSON_KEY);
    setToken(null);
    setPerson(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token || USE_MOCKS) return;
    const res = await getMe(token);
    setPerson(res.data.person);
    localStorage.setItem(PERSON_KEY, JSON.stringify(res.data.person));
  }, [token]);

  useEffect(() => {
    if (!token || USE_MOCKS) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getMe(token);
        if (!cancelled) {
          setPerson(res.data.person);
          localStorage.setItem(PERSON_KEY, JSON.stringify(res.data.person));
        }
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      person,
      loading,
      useMocks: USE_MOCKS,
      isAuthenticated: Boolean(token && person),
      setSession,
      updateLocalPerson,
      clearSession,
      refreshMe,
    }),
    [token, person, loading, setSession, updateLocalPerson, clearSession, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
