import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import apiClient from "../api/client";

export interface User {
  id: number;
  email: string;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  full_name: string;
  avatar_url?: string | null;
  is_superuser: boolean;
  is_local: boolean;
  role: string | null;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
  canView: boolean;
  canEdit: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem("access_token"),
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("access_token"));

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await apiClient.get<User>("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem("access_token");
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token, fetchUser]);

  const setToken = useCallback((newToken: string) => {
    localStorage.setItem("access_token", newToken);
    setTokenState(newToken);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await apiClient.post<{ access_token: string }>(
        "/auth/login",
        { email, password },
      );
      setToken(data.access_token);
    },
    [setToken],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setTokenState(null);
    setUser(null);
  }, []);

  const isAdmin = user?.is_superuser ?? false;
  const canEdit = isAdmin || user?.role === "manager";
  const canView = canEdit || user?.role === "viewer";

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, setToken, canView, canEdit, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
