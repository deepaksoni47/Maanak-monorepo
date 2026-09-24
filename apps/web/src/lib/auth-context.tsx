"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  designation: string;
  role: "INSPECTOR" | "REVIEWER" | "DIRECTOR" | "ADMIN" | string;
  laboratoryId: string;
  permissions?: string[];
}

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string) => Promise<boolean>;
  register: (userData: {
    fullName: string;
    email: string;
    password?: string;
    role?: string;
    designation?: string;
    facility?: string;
  }) => Promise<boolean>;
  logout: () => void;
  switchRoleQuick: (role: "INSPECTOR" | "REVIEWER" | "DIRECTOR" | "ADMIN") => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_URL =
  rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")
    ? rawApiUrl.replace(/\/+$/, "")
    : `https://${rawApiUrl.replace(/\/+$/, "")}`;
const TOKEN_KEY = "maanak_access_token";
const USER_KEY = "maanak_user_profile";

export function syncAuthCookies(token: string, role: string) {
  if (typeof document !== "undefined") {
    document.cookie = `maanak_access_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `maanak_user_role=${encodeURIComponent(role)}; path=/; max-age=604800; SameSite=Lax`;
  }
}

export function clearAuthCookies() {
  if (typeof document !== "undefined") {
    document.cookie = "maanak_access_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "maanak_user_role=; path=/; max-age=0; SameSite=Lax";
  }
}

export const PRESET_OFFICERS = [
  {
    role: "INSPECTOR" as const,
    title: "Legal Metrology Inspector",
    name: "R. K. Verma",
    email: "inspector@maanak.gov.in",
    designation: "Legal Metrology Officer / Testing Officer",
    facility: "RRSL Ahmedabad Bay #2",
    badgeColor: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  },
  {
    role: "REVIEWER" as const,
    title: "Technical Reviewer",
    name: "S. P. Patel",
    email: "reviewer@maanak.gov.in",
    designation: "Senior Metrologist / Technical Reviewer",
    facility: "RRSL Regional Office",
    badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    role: "DIRECTOR" as const,
    title: "Laboratory Director",
    name: "Dr. A. K. Sharma",
    email: "director@maanak.gov.in",
    designation: "Director & Head of Laboratory (Signatory)",
    facility: "HQ Standards Directorate",
    badgeColor: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  {
    role: "ADMIN" as const,
    title: "System Administrator",
    name: "System Administrator",
    email: "admin@maanak.gov.in",
    designation: "Metrological IT Systems Head",
    facility: "National Metrology Grid",
    badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from storage or fallback default officer on initial client mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          syncAuthCookies(storedToken, parsedUser.role);

          // Verify with backend asynchronously
          try {
            const res = await fetch(`${API_URL}/api/v1/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                const refreshedUser: UserProfile = {
                  id: data.user.sub || data.user.id,
                  username: data.user.username,
                  email: data.user.email,
                  fullName: data.user.fullName || (storedUser ? JSON.parse(storedUser).fullName : "Officer"),
                  designation: data.user.designation || (storedUser ? JSON.parse(storedUser).designation : "Testing Officer"),
                  role: data.user.role,
                  laboratoryId: data.user.laboratoryId,
                  permissions: data.user.permissions,
                };
                setUser(refreshedUser);
                localStorage.setItem(USER_KEY, JSON.stringify(refreshedUser));
                syncAuthCookies(storedToken, refreshedUser.role);
              }
            } else if (res.status === 401) {
              // Token expired, clear storage
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
              clearAuthCookies();
              setToken(null);
              setUser(null);
            }
          } catch {
            // Backend offline, keep stored session
          }
        } else {
          // No active session in storage - user is unauthenticated by default
          clearAuthCookies();
          setToken(null);
          setUser(null);
        }
      } catch {
        // Tolerated in SSR/hydration
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (identifier: string, password = "password123"): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.tokens?.accessToken && data.user) {
          const loggedUser: UserProfile = {
            id: data.user.id,
            username: data.user.username,
            email: data.user.email,
            fullName: data.user.fullName,
            designation: data.user.designation,
            role: data.user.role,
            laboratoryId: data.user.laboratoryId,
            permissions: data.user.permissions,
          };

          setToken(data.tokens.accessToken);
          setUser(loggedUser);
          localStorage.setItem(TOKEN_KEY, data.tokens.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(loggedUser));
          syncAuthCookies(data.tokens.accessToken, loggedUser.role);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (userData: {
      fullName: string;
      email: string;
      password?: string;
      role?: string;
      designation?: string;
      facility?: string;
    }): Promise<boolean> => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.tokens?.accessToken && data.user) {
            const registeredUser: UserProfile = {
              id: data.user.id,
              username: data.user.username,
              email: data.user.email,
              fullName: data.user.fullName || userData.fullName,
              designation: data.user.designation || "Legal Metrology Officer",
              role: data.user.role || "INSPECTOR",
              laboratoryId: data.user.laboratoryId || "11111111-2222-3333-4444-555555555555",
              permissions: data.user.permissions || [],
            };

            setToken(data.tokens.accessToken);
            setUser(registeredUser);
            localStorage.setItem(TOKEN_KEY, data.tokens.accessToken);
            localStorage.setItem(USER_KEY, JSON.stringify(registeredUser));
            syncAuthCookies(data.tokens.accessToken, registeredUser.role);
            return true;
          }
        }
        return false;
      } catch {
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearAuthCookies();
    setToken(null);
    setUser(null);
  }, []);

  const switchRoleQuick = useCallback(
    async (role: "INSPECTOR" | "REVIEWER" | "DIRECTOR" | "ADMIN"): Promise<boolean> => {
      const preset = PRESET_OFFICERS.find((p) => p.role === role);
      if (!preset) return false;
      return login(preset.email, "password123");
    },
    [login]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        switchRoleQuick,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      login: async () => false,
      register: async () => false,
      logout: () => {},
      switchRoleQuick: async () => false,
    };
  }
  return context;
}
