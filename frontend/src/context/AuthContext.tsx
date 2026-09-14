import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Loja } from '../types';
import { api } from '../services/api';
import { storage } from '../services/storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  lojas: Loja[];
  activeLoja: Loja | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  setActiveLoja: (loja: Loja) => void;
  refreshLojas: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [activeLoja, setActiveLojaState] = useState<Loja | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshLojas = async () => {
    try {
      const lista = await api.getLojas();
      setLojas(lista);
      if (lista.length > 0 && !activeLoja) {
        const savedLojaId = localStorage.getItem('estroque_active_loja_id');
        const found = lista.find((l) => l.id === savedLojaId) || lista[0];
        setActiveLojaState(found);
      }
    } catch {
      const fallback = storage.getLojas();
      setLojas(fallback);
      if (fallback.length > 0 && !activeLoja) {
        setActiveLojaState(fallback[0]);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const currentUser = await api.getMe();
        setUser(currentUser);
        await refreshLojas();
      } catch {
        setUser(storage.getUser());
        const lojasList = storage.getLojas();
        setLojas(lojasList);
        setActiveLojaState(lojasList[0] || null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const setActiveLoja = (loja: Loja) => {
    setActiveLojaState(loja);
    localStorage.setItem('estroque_active_loja_id', loja.id);
  };

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      setUser(res.user);
      setToken(res.token);
      await refreshLojas();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        lojas,
        activeLoja,
        isLoading,
        login,
        logout,
        setActiveLoja,
        refreshLojas,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
