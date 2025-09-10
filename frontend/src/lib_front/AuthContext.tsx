'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from './api';

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  display_name?: string;
  twoFactorEnabled: boolean;
  is_admin?: boolean;
  stats?: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { username: string; password: string; twoFactorToken?: string }) => Promise<{ 
    success: boolean; 
    error?: string; 
    requires2FA?: boolean;
    tempUserId?: number;
    user?: any;
  }>;
  register: (userData: { username: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialiser l'état avec les données du localStorage
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');
      if (storedUser && token) {
        try {
          return JSON.parse(storedUser);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('accessToken');
    }
    return false;
  });

  // Vérifier l'authentification au chargement
  useEffect(() => {
    console.log('🔄 Initial Auth State:', { user, isAuthenticated });
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('🔄 Starting Auth Check');
    try {
      const token = apiClient.getToken();
      const storedUser = localStorage.getItem('user');
      
      console.log('📦 Stored Data:', { hasToken: !!token, hasStoredUser: !!storedUser });
      
      if (!token) {
        console.log('❌ No token found');
        setLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // Si nous avons un utilisateur stocké, l'utiliser temporairement
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('❌ Error parsing stored user:', e);
        }
      }

      // Vérifier le token auprès du backend
      console.log('🔄 Verifying token with backend...');
      const data = await apiClient.verifyToken(token);

      if ((data.valid || data.code === 'TOKEN_VALID') && data.user) {
        console.log('✅ Token valid, updating user data');
        setUser(data.user);
        setIsAuthenticated(true);
        apiClient.setToken(token);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        console.log('❌ Invalid token response:', data);
        setIsAuthenticated(false);
        setUser(null);
        apiClient.clearAuth();
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      // Garder l'authentification en cas d'erreur réseau
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('Failed to fetch'))) {
        console.log('⚠️ Network error - keeping existing auth state');
        // Ne rien faire, garder l'état actuel
        return;
      } else {
        console.log('❌ Non-network error - clearing auth state');
        setUser(null);
        setIsAuthenticated(false);
        apiClient.clearAuth();
      }
    } finally {
      setLoading(false);
      console.log('🔄 Auth Check Complete:', { user, isAuthenticated });
    }
  };

  const login = async (credentials: { username: string; password: string; twoFactorToken?: string }) => {
    try {
      const data = await apiClient.login(credentials);
      
      if (data.requires_2fa) {
        return { 
          success: false, 
          requires2FA: true,
          tempUserId: data.tempUserId,
          user: data.user
        };
      }
      
      if (data.accessToken) {
        apiClient.setToken(data.accessToken);
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Stocker refresh token
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        // Stocker utilisateur pour persistance
        localStorage.setItem('user', JSON.stringify(data.user));
        
        return { success: true };
      }
      
      return { success: false, error: data.error || data.message || 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const register = async (userData: { username: string; email: string; password: string }) => {
    try {
      const data = await apiClient.register(userData);
      
      if (data.accessToken) {
        apiClient.setToken(data.accessToken);
        setUser(data.user);
        setIsAuthenticated(true);
        
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true };
      }
      
      return { success: false, error: data.error || data.message || 'Registration failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    console.log('🔥 AuthContext.logout() - Début de la déconnexion');
    try {
      // Appeler l'endpoint de logout
      console.log('🔥 AuthContext.logout() - Appel apiClient.logout()');
      await apiClient.logout();
      console.log('🔥 AuthContext.logout() - apiClient.logout() terminé avec succès');
    } catch (error) {
      console.error('🔥 AuthContext.logout() - Erreur:', error);
    } finally {
      // Nettoyer l'état local dans tous les cas
      console.log('🔥 AuthContext.logout() - Nettoyage de l\'état local');
      apiClient.clearAuth();
      setUser(null);
      setIsAuthenticated(false);
      console.log('🔥 AuthContext.logout() - Déconnexion terminée');
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateUser,
    checkAuthStatus
  };

  // Ne pas rendre les enfants tant que la vérification initiale n'est pas terminée
  if (loading) {
    return null; // ou un composant de chargement si vous préférez
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
