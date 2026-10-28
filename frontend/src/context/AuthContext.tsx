import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Loja, RegisterTenantPayload, ImpersonateResult } from '../types';
import { api } from '../services/api';
import { storage } from '../services/storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  lojas: Loja[];
  activeLoja: Loja | null;
  isLoading: boolean;
  isImpersonating: boolean;
  impersonationData: ImpersonateResult | null;
  login: (email: string, pass: string) => Promise<void>;
  registerTenant: (dados: RegisterTenantPayload) => Promise<void>;
  logout: () => void;
  setActiveLoja: (loja: Loja) => void;
  refreshLojas: () => Promise<void>;
  impersonateTenant: (tenantId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [activeLoja, setActiveLojaState] = useState<Loja | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return !!localStorage.getItem('estroque_impersonator_backup');
  });
  const [impersonationData, setImpersonationData] = useState<ImpersonateResult | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('estroque_impersonation_data');
    return raw ? JSON.parse(raw) : null;
  });

  const refreshLojas = async () => {
    try {
      const lista = await api.getLojas();
      setLojas(lista);
      if (lista.length > 0) {
        const savedLojaId = typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null;
        const found = lista.find((l) => l.id === savedLojaId) || lista[0];
        setActiveLojaState(found);
      } else {
        setActiveLojaState(null);
      }
    } catch {
      const fallback = storage.getLojas();
      setLojas(fallback);
      setActiveLojaState(fallback[0] || null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const token = api.getToken();
        if (!token) {
          setUser(null);
          setLojas([]);
          setActiveLojaState(null);
          return;
        }
        const currentUser = await api.getMe();
        setUser(currentUser);
        await refreshLojas();
      } catch {
        api.logout();
        storage.clearUser();
        setUser(null);
        setLojas([]);
        setActiveLojaState(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const setActiveLoja = (loja: Loja) => {
    setActiveLojaState(loja);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('estroque_active_loja_id', loja.id);
    }
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

  const registerTenant = async (dados: RegisterTenantPayload) => {
    setIsLoading(true);
    try {
      const res = await api.registerTenant(dados);
      setUser(res.user);
      setToken(res.token);
      await refreshLojas();
    } finally {
      setIsLoading(false);
    }
  };

  const impersonateTenant = async (tenantId: string) => {
    setIsLoading(true);
    try {
      // Salva backup da sessão original do super admin
      const backup = {
        token: api.getToken(),
        user,
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('estroque_impersonator_backup', JSON.stringify(backup));
      }

      const res = await api.impersonateTenant(tenantId);
      api.setToken(res.access_token);
      setToken(res.access_token);

      const tenantUser: User = {
        id: res.usuario_id,
        nome: res.usuario_nome,
        email: res.usuario_email,
        role: res.usuario_role as any,
        tenant_id: res.tenant_id,
        loja_atribuida_id: res.loja_id || undefined,
      };
      setUser(tenantUser);
      storage.setUser(tenantUser);
      setIsImpersonating(true);
      setImpersonationData(res);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('estroque_impersonation_data', JSON.stringify(res));
      }

      await refreshLojas();
    } finally {
      setIsLoading(false);
    }
  };

  const stopImpersonating = async () => {
    setIsLoading(true);
    try {
      if (typeof localStorage !== 'undefined') {
        const backupRaw = localStorage.getItem('estroque_impersonator_backup');
        if (backupRaw) {
          try {
            const backup = JSON.parse(backupRaw);
            if (backup.token) {
              api.setToken(backup.token);
              setToken(backup.token);
              setUser(backup.user);
              storage.setUser(backup.user);
            }
          } catch (e) {
            console.error('Falha ao restaurar backup de autenticação', e);
          }
        }
        localStorage.removeItem('estroque_impersonator_backup');
        localStorage.removeItem('estroque_impersonation_data');
      }
      setIsImpersonating(false);
      setImpersonationData(null);
      await refreshLojas();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    storage.clearUser();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('estroque_impersonator_backup');
      localStorage.removeItem('estroque_impersonation_data');
    }
    setUser(null);
    setToken(null);
    setLojas([]);
    setActiveLojaState(null);
    setIsImpersonating(false);
    setImpersonationData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        lojas,
        activeLoja,
        isLoading,
        isImpersonating,
        impersonationData,
        login,
        registerTenant,
        logout,
        setActiveLoja,
        refreshLojas,
        impersonateTenant,
        stopImpersonating,
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
