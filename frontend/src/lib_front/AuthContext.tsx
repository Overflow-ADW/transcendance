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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = apiClient.getToken();
      const storedUser = localStorage.getItem('user');

      if (!token) {
        setLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (e) {
          // Silent error handling
        }
      }

      const data = await apiClient.verifyToken(token);
      if ((data.valid || data.code === 'TOKEN_VALID') && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        apiClient.setToken(token);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        setIsAuthenticated(false);
        setUser(null);
        apiClient.clearAuth();
      }
    } catch (error) {
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('Failed to fetch'))) {
        return;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        apiClient.clearAuth();
      }
    } finally {
      setLoading(false);
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

        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        localStorage.setItem('user', JSON.stringify(data.user));

        return { success: true };
      }

      return { success: false, error: data.error || data.message || 'Login failed' };
    } catch (error: any) {
      if (error.message && (error.message.includes('Identifiants invalides') || error.message.includes('401'))) {
        return { success: false, error: 'Username or password incorect' };
      }
      return { success: false, error: error.message || 'Erreur de connexion' };
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
      await apiClient.logout();
    } catch (error) {
    } finally {
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

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}