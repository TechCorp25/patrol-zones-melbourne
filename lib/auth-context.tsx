import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";

const IS_WEB = Platform.OS === "web";
const API_BASE_URL = IS_WEB ? "" : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? ""}`;
const AUTH_TOKEN_KEY = "patrol_auth_token";
const HEARTBEAT_INTERVAL_MS = 30_000;

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

function presenceRequest(endpoint: string, authToken: string): void {
  fetch(`${API_BASE_URL}/api/presence/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ clientType: Platform.OS === "ios" ? "ios" : "android" }),
  }).catch(() => {});
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);

  tokenRef.current = token;

  const startHeartbeat = useCallback((authToken: string) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    presenceRequest("connect", authToken);
    heartbeatRef.current = setInterval(() => {
      presenceRequest("heartbeat", authToken);
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  const stopHeartbeat = useCallback((authToken: string | null) => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (authToken) {
      presenceRequest("disconnect", authToken);
    }
  }, []);

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
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!token || IS_WEB) return;
    startHeartbeat(token);
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [token, startHeartbeat]);

  useEffect(() => {
    if (IS_WEB) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      const currentToken = tokenRef.current;
      if (!currentToken) return;
      if (nextState === "active") {
        startHeartbeat(currentToken);
      } else if (nextState === "background" || nextState === "inactive") {
        stopHeartbeat(currentToken);
      }
    });
    return () => subscription.remove();
  }, [startHeartbeat, stopHeartbeat]);

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
    const currentToken = token;
    if (currentToken) {
      stopHeartbeat(currentToken);
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch { /* ignore */ }
    }
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token, stopHeartbeat]);

  const value = useMemo(() => ({
    user, token, loading, login, register, logout,
  }), [user, token, loading, login, register, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
