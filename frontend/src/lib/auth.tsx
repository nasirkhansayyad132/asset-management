import React, { createContext, useContext, useMemo, useState } from "react";
import { apiFetch } from "./api";

export type Role =
  | "ADMIN"
  | "STORE_CLERK"
  | "APPROVER"
  | "MAINTENANCE"
  | "INVENTORY"
  | "AUDITOR";

export type User = {
  id: string;
  email: string;
  role: Role;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = "mam_auth";

const readStorage = () => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return { user: null, token: null };
  }
  try {
    const parsed = JSON.parse(raw) as { user?: User; token?: string };
    return { user: parsed.user || null, token: parsed.token || null };
  } catch {
    return { user: null, token: null };
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const stored = readStorage();
  const [user, setUser] = useState<User | null>(stored.user);
  const [token, setToken] = useState<string | null>(stored.token);

  const login = async (email: string, password: string) => {
    const response = await apiFetch<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: response.token, user: response.user })
    );
    setToken(response.token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, login, logout }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("AuthProvider is missing");
  }
  return ctx;
};
