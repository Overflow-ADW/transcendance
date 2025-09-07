'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from './api';

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  twoFactorEnabled: boolean;
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
  login: (credentials: { username: string; password: string; twoFactorToken?: string }) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = apiClient.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // Vérifier le token auprès du backend
      const data = await apiClient.verifyToken(token);

      if (data.valid && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        apiClient.setToken(token);
      } else {
        // Token invalide, nettoyer
        apiClient.clearAuth();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      apiClient.clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: { username: string; password: string; twoFactorToken?: string }) => {
    try {
      const data = await apiClient.login(credentials);
      
      if (data.requires2FA) {
        return { success: false, requires2FA: true };
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
    try {
      // Appeler l'endpoint de logout
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Nettoyer l'état local dans tous les cas
      apiClient.clearAuth();
      setUser(null);
      setIsAuthenticated(false);
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
