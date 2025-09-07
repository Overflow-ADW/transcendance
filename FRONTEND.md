# 🎨 Frontend - Backend Integration Guide

## 📋 Vue d'Ensemble

Ce document détaille les problèmes identifiés dans la liaison backend ↔ frontend et fournit les solutions pour une intégration complète du système d'authentification et des API.

## ✅ **Ce qui FONCTIONNE Déjà**

D'après l'analyse du projet :
- ✅ **API REST complète** avec Fastify
- ✅ **Authentication JWT** fonctionnelle côté backend
- ✅ **OAuth Google/GitHub** opérationnel côté backend
- ✅ **Base de données SQLite** avec 9 tables structurées
- ✅ **Frontend Next.js** avec structure de base

## ❌ **PROBLÈMES MAJEURS Identifiés**

### 🚨 **1. Configuration API Frontend MANQUANTE**

Le frontend n'a aucune configuration pour communiquer avec le backend.

**Solution :** Créer un client API centralisé.

### 🚨 **2. Context d'Authentification ABSENT**

Aucun système de gestion des tokens JWT côté frontend.

**Solution :** Implémenter AuthContext avec React Context API.

### 🚨 **3. Pages Déconnectées**

Les pages utilisent `"use client"` mais n'ont aucune logique de connexion backend.

**Solution :** Refactoriser les pages avec les hooks d'authentification.

## 🔧 **Solutions Détaillées**

### **1. Client API Centralisé**

Créer `frontend/src/lib_front/api.ts` (remplacer l'existant) :

```javascript
// Configuration centralisée pour les appels API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  // Méthode pour définir le token JWT
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // Méthode pour récupérer le token
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  // Wrapper pour fetch avec authentification automatique
  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...options
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      // Gestion des erreurs d'authentification
      if (response.status === 401) {
        this.clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }

      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Méthodes d'authentification
  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    return response.json();
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response.json();
  }

  async verifyToken(token) {
    const response = await this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return response.json();
  }

  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST'
    });
    return response.json();
  }

  async refreshToken() {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') 
      : null;
    
    if (!refreshToken) return null;

    const response = await this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
    return response.json();
  }

  // Méthodes utilisateur
  async getUserProfile() {
    const response = await this.request('/users/profile');
    return response.json();
  }

  async updateProfile(profileData) {
    const response = await this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    return response.json();
  }

  async changePassword(passwordData) {
    const response = await this.request('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    });
    return response.json();
  }

  async getFriends() {
    const response = await this.request('/users/friends');
    return response.json();
  }

  async addFriend(username) {
    const response = await this.request('/users/friends', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    return response.json();
  }

  // Méthodes OAuth
  getOAuthUrl(provider) {
    return `${this.baseURL}/oauth/${provider}`;
  }

  async getOAuthProviders() {
    const response = await this.request('/oauth/providers');
    return response.json();
  }

  async linkOAuthAccount(provider, authCode) {
    const response = await this.request('/oauth/link', {
      method: 'POST',
      body: JSON.stringify({ provider, authCode })
    });
    return response.json();
  }

  async unlinkOAuthAccount(provider) {
    const response = await this.request(`/oauth/unlink/${provider}`, {
      method: 'DELETE'
    });
    return response.json();
  }

  async getOAuthConnections() {
    const response = await this.request('/oauth/user/connections');
    return response.json();
  }

  // Méthodes 2FA
  async enable2FA() {
    const response = await this.request('/2fa/setup', {
      method: 'POST'
    });
    return response.json();
  }

  async verify2FA(token) {
    const response = await this.request('/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return response.json();
  }

  async disable2FA(token) {
    const response = await this.request('/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return response.json();
  }

  // Méthodes de jeu
  async getGameHistory(limit = 10) {
    const response = await this.request(`/games/history?limit=${limit}`);
    return response.json();
  }

  async getGameStats() {
    const response = await this.request('/games/stats');
    return response.json();
  }

  async createTournament(tournamentData) {
    const response = await this.request('/games/tournaments', {
      method: 'POST',
      body: JSON.stringify(tournamentData)
    });
    return response.json();
  }

  async joinTournament(tournamentId) {
    const response = await this.request(`/games/tournaments/${tournamentId}/join`, {
      method: 'POST'
    });
    return response.json();
  }

  // Nettoyage authentification
  clearAuth() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }
}

export const apiClient = new ApiClient();
```

### **2. Context d'Authentification**

Créer `frontend/src/lib_front/AuthContext.tsx` :

```javascript
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
        // Token invalide, essayer de refresh
        const refreshData = await apiClient.refreshToken();
        
        if (refreshData?.accessToken) {
          apiClient.setToken(refreshData.accessToken);
          setUser(refreshData.user);
          setIsAuthenticated(true);
          
          if (refreshData.refreshToken) {
            localStorage.setItem('refresh_token', refreshData.refreshToken);
          }
        } else {
          // Refresh impossible, déconnecter
          apiClient.clearAuth();
        }
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
          localStorage.setItem('refresh_token', data.refreshToken);
        }
        
        // Stocker utilisateur pour persistance
        localStorage.setItem('user', JSON.stringify(data.user));
        
        return { success: true };
      }
      
      return { success: false, error: data.error || 'Login failed' };
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
          localStorage.setItem('refresh_token', data.refreshToken);
        }
        
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true };
      }
      
      return { success: false, error: data.error || 'Registration failed' };
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
```

### **3. Mise à Jour du Store Principal**

Modifier `frontend/src/lib_front/store.tsx` :

```javascript
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthProvider } from './AuthContext';

interface AppContextType {
  lang: string;
  setLang: (lang: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  isOnline: boolean;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<string>('fr');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isOnline, setIsOnline] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Détecter la connexion réseau
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Charger les préférences depuis localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_lang');
    const savedTheme = localStorage.getItem('preferred_theme');

    if (savedLang) setLang(savedLang);
    if (savedTheme) setTheme(savedTheme as 'dark' | 'light');
  }, []);

  // Sauvegarder les préférences
  useEffect(() => {
    localStorage.setItem('preferred_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('preferred_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove après duration
    const duration = notification.duration || 5000;
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const value = {
    lang,
    setLang,
    theme,
    setTheme,
    isOnline,
    notifications,
    addNotification,
    removeNotification
  };

  return (
    <AppContext.Provider value={value}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </AppContext.Provider>
  );
}
```

### **4. Page de Connexion Fonctionnelle**

Modifier `frontend/src/views/LoginView.tsx` :

```javascript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib_front/AuthContext';
import { useApp } from '../lib_front/store';
import { apiClient } from '../lib_front/api';

export default function LoginView() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    twoFactorToken: ''
  });
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const { addNotification } = useApp();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData);
      
      if (result.success) {
        addNotification({
          type: 'success',
          message: 'Connexion réussie !'
        });
        router.push('/');
      } else if (result.requires2FA) {
        setRequires2FA(true);
        addNotification({
          type: 'info',
          message: 'Code 2FA requis'
        });
      } else {
        setError(result.error || 'Erreur de connexion');
        addNotification({
          type: 'error',
          message: result.error || 'Erreur de connexion'
        });
      }
    } catch (error: any) {
      setError('Erreur de connexion');
      addNotification({
        type: 'error',
        message: 'Erreur de connexion'
      });
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    // Redirection vers l'OAuth backend
    window.location.href = apiClient.getOAuthUrl(provider);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 w-full max-w-md border border-white/20">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Connexion
        </h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white/80 mb-2">Nom d'utilisateur</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
              placeholder="Entrez votre nom d'utilisateur"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-white/80 mb-2">Mot de passe</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
              placeholder="Entrez votre mot de passe"
              disabled={loading}
            />
          </div>

          {requires2FA && (
            <div>
              <label className="block text-white/80 mb-2">Code 2FA</label>
              <input
                type="text"
                name="twoFactorToken"
                value={formData.twoFactorToken}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                placeholder="123456"
                maxLength={6}
                disabled={loading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6">
          <div className="text-center text-white/60 mb-4">Ou connectez-vous avec</div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => handleOAuthLogin('google')}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              disabled={loading}
            >
              Google
            </button>
            <button
              onClick={() => handleOAuthLogin('github')}
              className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              disabled={loading}
            >
              GitHub
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <span className="text-white/60">Pas de compte ? </span>
          <a href="/signin" className="text-purple-400 hover:text-purple-300">
            S'inscrire
          </a>
        </div>
      </div>
    </div>
  );
}
```

### **5. Variables d'Environnement Frontend**

Créer `frontend/.env.local` :

```env
# Configuration API Backend
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# OAuth Configuration (pour les redirections)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id

# WebSocket pour le temps réel
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# Configuration du site
NEXT_PUBLIC_SITE_URL=http://localhost:8080
NEXT_PUBLIC_SITE_NAME=Transcendance

# Analytics (optionnel)
NEXT_PUBLIC_GA_ID=
```

### **6. Composant de Notification**

Créer `frontend/src/components/ui/NotificationContainer.tsx` :

```javascript
'use client';
import { useApp } from '../../lib_front/store';

export default function NotificationContainer() {
  const { notifications, removeNotification } = useApp();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            p-4 rounded-lg border backdrop-blur-sm shadow-lg max-w-sm transition-all
            ${notification.type === 'success' && 'bg-green-500/20 border-green-500/50 text-green-100'}
            ${notification.type === 'error' && 'bg-red-500/20 border-red-500/50 text-red-100'}
            ${notification.type === 'warning' && 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100'}
            ${notification.type === 'info' && 'bg-blue-500/20 border-blue-500/50 text-blue-100'}
          `}
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-4 text-white/60 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## 📊 **Résumé des Modifications Nécessaires**

| Fichier | Action | Priorité |
|---------|--------|----------|
| `frontend/src/lib_front/api.ts` | ⚠️ **REMPLACER** | 🔴 CRITIQUE |
| `frontend/src/lib_front/AuthContext.tsx` | ➕ **CRÉER** | 🔴 CRITIQUE |
| `frontend/src/lib_front/store.tsx` | ⚠️ **MODIFIER** | 🟡 IMPORTANT |
| `frontend/src/views/LoginView.tsx` | ⚠️ **REMPLACER** | 🔴 CRITIQUE |
| `frontend/src/app/layout.tsx` | ⚠️ **MODIFIER** | 🟡 IMPORTANT |
| `frontend/.env.local` | ➕ **CRÉER** | 🟡 IMPORTANT |
| `frontend/src/components/ui/NotificationContainer.tsx` | ➕ **CRÉER** | 🟢 OPTIONNEL |

## 🚀 **Étapes d'Implémentation**

### **Étape 1: Configuration de Base**
1. Créer le fichier `.env.local`
2. Implémenter le client API (`api.ts`)
3. Créer l'AuthContext

### **Étape 2: Pages Principales**
1. Refactoriser LoginView
2. Refactoriser SignInView (inscription)
3. Modifier le layout principal

### **Étape 3: Intégration**
1. Ajouter NotificationContainer
2. Tester les routes d'authentification
3. Vérifier OAuth flows

### **Étape 4: Pages Secondaires**
1. ProfileView avec API calls
2. SettingsView avec gestion OAuth
3. GameView avec stats utilisateur

## 🧪 **Tests à Effectuer**

1. **Authentification**
   - [ ] Login/logout fonctionnel
   - [ ] Registration fonctionnelle
   - [ ] Token refresh automatique
   - [ ] 2FA workflow

2. **OAuth**
   - [ ] Login Google/GitHub
   - [ ] Liaison/déliaison comptes
   - [ ] Redirections correctes

3. **API Integration**
   - [ ] Calls API authentifiés
   - [ ] Gestion erreurs 401/403
   - [ ] Persistance utilisateur

4. **UX**
   - [ ] Loading states
   - [ ] Error messages
   - [ ] Notifications
   - [ ] Responsive design

## 🔗 **Liens avec le Backend**

### **Routes Critiques à Tester**
- `POST /api/auth/login` → LoginView
- `POST /api/auth/register` → SignInView
- `GET /api/users/profile` → ProfileView
- `GET /api/oauth/providers` → OAuth buttons
- `GET /api/games/stats` → GameView

### **WebSocket Integration**
Pour les fonctionnalités temps réel (jeux, chat), ajouter :
```javascript
// Dans api.ts
import { io } from 'socket.io-client';

export const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  autoConnect: false
});

// Connecter après authentification
export const connectSocket = (token) => {
  socket.auth = { token };
  socket.connect();
};
```

## 📝 **Notes Importantes**

1. **Sécurité** : Tous les tokens sont stockés en localStorage (attention en production)
2. **Types** : Ajouter TypeScript types pour une meilleure DX
3. **Error Boundary** : Implémenter pour capturer les erreurs React
4. **Loading States** : Ajouter des skeletons pour une meilleure UX
5. **Offline Support** : Considérer PWA features pour usage offline

Cette structure fournit une base solide pour connecter votre backend Fastify avec le frontend Next.js de manière sécurisée et performante.
