import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { deleteSecureItem, getSecureItem, setSecureItem } from '@/services/secure-storage';

type AuthState = { token: string | null; setToken: (token: string | null) => Promise<void> };
const AuthContext = createContext<AuthState>({ token: null, setToken: async () => {} });
const TOKEN_KEY = 'auth_token';

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => { getSecureItem(TOKEN_KEY).then(setTokenState); }, []);

  const setToken = async (next: string | null) => {
    setTokenState(next);
    if (next) await setSecureItem(TOKEN_KEY, next);
    else await deleteSecureItem(TOKEN_KEY);
  };

  return <AuthContext.Provider value={{ token, setToken }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
