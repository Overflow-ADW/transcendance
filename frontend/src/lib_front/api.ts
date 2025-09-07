import type { MatchItem, Winrate } from "./types";

// Configuration API centralisée avec détection automatique
function getApiBaseUrl(): string {
  // En mode SPA avec proxy Nginx, utiliser l'origine actuelle
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback pour le build-time
  return 'http://localhost:8080';
}

const BASE_URL = getApiBaseUrl().replace(/\/+$/, ""); // Supprimer les slashes finaux

/**
 * Client API centralisé avec authentification automatique
 */
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = BASE_URL;
  }

  /**
   * Récupérer le token depuis localStorage
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Définir le token d'authentification
   */
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  /**
   * Nettoyer l'authentification
   */
  clearAuth(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  /**
   * Wrapper fetch avec authentification automatique
   */
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = this.token || this.getToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, config);
      
      // Gestion automatique des erreurs d'authentification
      if (response.status === 401) {
        // Essayer de refresh le token
        const refreshed = await this.tryRefreshToken();
        
        if (refreshed) {
          // Retry avec le nouveau token
          const newConfig = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${this.token}`
            }
          };
          return fetch(url, newConfig);
        } else {
          // Rediriger vers login si refresh impossible
          this.clearAuth();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Authentication required');
        }
      }

      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * Essayer de refresh le token
   */
  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refreshToken') || localStorage.getItem('refresh_token')
      : null;
    
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          this.setToken(data.accessToken);
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  // ============ MÉTHODES D'AUTHENTIFICATION ============

  async login(credentials: { username: string; password: string; twoFactorToken?: string }) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  }

  async register(userData: { username: string; password: string; email?: string }) {
    const response = await fetch(`${this.baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  }

  async verifyToken(token: string) {
    const response = await fetch(`${this.baseURL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return response.json();
  }

  async logout() {
    const response = await this.request('/api/auth/logout', { method: 'POST' });
    return response.json();
  }

  // ============ MÉTHODES UTILISATEUR ============

  async getProfile() {
    const response = await this.request('/api/users/profile');
    return response.json();
  }

  async updateProfile(profileData: any) {
    const response = await this.request('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    return response.json();
  }

  async changePassword(passwordData: { currentPassword: string; newPassword: string }) {
    const response = await this.request('/api/users/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    });
    return response.json();
  }

  async getFriends() {
    const response = await this.request('/api/users/friends');
    return response.json();
  }

  async addFriend(friendData: any) {
    const response = await this.request('/api/users/friends', {
      method: 'POST',
      body: JSON.stringify(friendData)
    });
    return response.json();
  }
}

// Instance singleton
export const apiClient = new ApiClient();

// ============ FONCTIONS D'API LEGACY ============
// Change BASE_URL si back séparé (ou garde /api si Next API en local)
const LEGACY_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function apiGetWinrates(): Promise<Winrate[]> {
  const response = await apiClient.request('/api/profile/winrates', { cache: "no-store" } as any);
  if (!response.ok) throw new Error("Failed to fetch winrates");
  return response.json();
}

export async function apiPutWinrates(payload: Winrate[]) {
  const response = await apiClient.request('/api/profile/winrates', {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Failed to update winrates");
  return response.json();
}

export async function apiGetMatches(): Promise<MatchItem[]> {
  const response = await apiClient.request('/api/profile/matches', { cache: "no-store" } as any);
  if (!response.ok) throw new Error("Failed to fetch matches");
  return response.json();
}

export async function apiPostMatch(payload: MatchItem) {
  const response = await apiClient.request('/api/profile/matches', {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Failed to add match");
  return response.json();
}
