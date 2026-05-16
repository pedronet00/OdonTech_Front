import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from '../../infrastructure/config/api';

export interface User {
  sub: string;
  email: string;
  jti: string;
  nome: string;
  clinica_id: string;
  clinica_nome: string;
  cro: string;
  exp: number;
  iss: string;
  aud: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('@OdonTech:token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('@OdonTech:refreshToken'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initializeAuth = () => {
    if (token) {
      try {
        const decoded = jwtDecode<User>(token);
        // Verifica se o access token expirou (folga de 1 minuto)
        const isExpired = decoded.exp * 1000 < (Date.now() + 60000);
        
        if (isExpired) {
          // Tenta fazer o refresh se tiver refresh token
          handleRefresh();
        } else {
          setUser(decoded);
          setLoading(false);
        }
      } catch (error) {
        console.error('Token inválido', error);
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('unauthorized', handleUnauthorized);
    
    initializeAuth();

    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []);

  const handleRefresh = async () => {
    const currentRefreshToken = refreshToken || localStorage.getItem('@OdonTech:refreshToken');
    if (!currentRefreshToken) {
      logout();
      return;
    }

    try {
      // Endpoint de refresh (assumindo /auth/refresh ou similar baseado no padrão do projeto)
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken })
      });

      if (!response.ok) throw new Error('Refresh failed');

      const data: LoginResponse = await response.json();
      login(data);
    } catch (error) {
      console.error('Refresh error', error);
      logout();
    }
  };

  const login = (data: LoginResponse) => {
    localStorage.setItem('@OdonTech:token', data.accessToken);
    localStorage.setItem('@OdonTech:refreshToken', data.refreshToken);
    localStorage.setItem('@OdonTech:expiresAt', data.expiresAt);
    
    setToken(data.accessToken);
    setRefreshToken(data.refreshToken);

    try {
      const decoded = jwtDecode<User>(data.accessToken);
      setUser(decoded);
    } catch (e) {
      console.error('Erro ao decodificar token no login', e);
    }
  };

  const logout = () => {
    localStorage.removeItem('@OdonTech:token');
    localStorage.removeItem('@OdonTech:refreshToken');
    localStorage.removeItem('@OdonTech:expiresAt');
    
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!user,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
