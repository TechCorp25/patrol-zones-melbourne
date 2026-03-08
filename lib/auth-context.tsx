import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const IS_WEB = Platform.OS === "web";
const API_BASE_URL = IS_WEB ? "" : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ""}`;
const AUTH_TOKEN_KEY = "patrol_auth_token";

export interface AuthUser {
  id: string;
  officerNumber: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (officerNumber: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, officerNumber: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_WEB) {
      setLoading(false);
      return;
    }
    AsyncStorage.getItem(AUTH_TOKEN_KEY).then(async (storedToken) => {
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json() as { user: AuthUser };
          setUser(data.user);
          setToken(storedToken);
        } else {
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        }
      } catch {
        // Offline — keep token in storage, clear state so login screen shows
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (officerNumber: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerNumber, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error?.message || "Login failed" };
      }
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.session.token);
      setToken(data.session.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please check your connection." };
    }
  }, []);

  const register = useCallback(async (
    email: string,
    officerNumber: string,
    password: string,
    confirmPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, officerNumber, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        const fieldErrors = data.error?.details?.fieldErrors;
        if (fieldErrors) {
          const firstField = Object.keys(fieldErrors)[0];
          const msg = fieldErrors[firstField]?.[0];
          if (msg) return { success: false, error: msg };
        }
        return { success: false, error: data.error?.message || "Registration failed" };
      }
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.session.token);
      setToken(data.session.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please check your connection." };
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(() => ({
    user, token, loading, login, register, logout,
  }), [user, token, loading, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
