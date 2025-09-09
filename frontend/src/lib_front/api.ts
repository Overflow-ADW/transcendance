import type { MatchItem, Winrate, GameHistoryResponse } from "./types";

// Configuration API centralisée avec détection automatique
function getApiBaseUrl(): string {
  // En mode développement, pointer vers le backend Fastify
  if (typeof window !== 'undefined') {
    // En développement, utiliser le backend sur port 3000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // En production, utiliser l'origine actuelle (avec proxy Nginx)
    return window.location.origin;
  }
  
  // Fallback pour le build-time
  return 'http://localhost:3000';
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
   * Récupérer le token depuis localStorage ou sessionStorage
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      // Vérifier d'abord this.token
      if (this.token) {
        return this.token;
      }
      
      // Ensuite vérifier sessionStorage (navigation actuelle)
      const sessionToken = sessionStorage.getItem('accessToken');
      if (sessionToken) {
        this.token = sessionToken;
        return sessionToken;
      }
      
      // Enfin vérifier localStorage (persistance longue durée)
      const localToken = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
      if (localToken) {
        this.token = localToken;
        // Synchroniser avec sessionStorage
        sessionStorage.setItem('accessToken', localToken);
        return localToken;
      }
    }
    return null;
  }

  /**
   * Définir le token d'authentification
   */
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('accessToken', token);
        // Stocker aussi dans sessionStorage pour la persistance pendant la navigation
        sessionStorage.setItem('accessToken', token);
      } catch (e) {
        console.error('Error setting token:', e);
      }
    }
  }

  /**
   * Nettoyer l'authentification
   */
  clearAuth(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      try {
        // Nettoyer localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Nettoyer sessionStorage
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
      } catch (e) {
        console.error('Error clearing auth:', e);
      }
    }
  }

  /**
   * Wrapper fetch avec authentification automatique
   */
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    let token = this.token || this.getToken();
    
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
      let response = await fetch(url, config);
      
      // Gestion automatique des erreurs d'authentification
      if (response.status === 401) {
        // Essayer de refresh le token
        const refreshed = await this.tryRefreshToken();
        
        if (refreshed) {
          // Mettre à jour le token dans la config
          token = this.token;
          const newConfig = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${token}`
            }
          };
          // Réessayer la requête avec le nouveau token
          response = await fetch(url, newConfig);
          
          // Si ça échoue encore après le refresh, c'est une vraie erreur d'auth
          if (response.status === 401) {
            throw new Error('Authentication required');
          }
        } else {
          throw new Error('Authentication required');
        }
      }
      
      return response;

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
    try {
      const response = await fetch(`${this.baseURL}/api/auth/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      
      // Considérer la réponse comme valide si le code est TOKEN_VALID ou si valid est true
      if (data.code === 'TOKEN_VALID' || data.valid) {
        return {
          valid: true,
          user: data.user,
          ...data
        };
      }
      
      return data;
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  }

  async logout() {
    const response = await this.request('/api/auth/logout', { method: 'POST' });
    return response.json();
  }

  // ============ MÉTHODES UTILISATEUR ET PROFIL ============

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

<<<<<<< Updated upstream
  // ============ MÉTHODES AVATAR ============

  async uploadAvatar(file: File): Promise<{avatarUrl: string, fileName: string, fileSize: number, message: string}> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const imageData = reader.result as string;
          
          const response = await this.request('/api/users/avatar', {
            method: 'POST',
            body: JSON.stringify({
              imageData,
              fileName: file.name,
              mimeType: file.type
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de l\'upload');
          }

          const result = await response.json();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsDataURL(file);
    });
  }

  async deleteAvatar(): Promise<{message: string}> {
=======
  async changeUsername(username: string) {
    const response = await this.request('/api/users/username', {
      method: 'PUT',
      body: JSON.stringify({ username })
    });
    return response.json();
  }

  async uploadAvatar(avatarUrl: string) {
>>>>>>> Stashed changes
    const response = await this.request('/api/users/avatar', {
      method: 'DELETE'
    });
    return response.json();
  }

  // ============ MÉTHODES TOURNOI ============

  async searchUsers(query: string) {
    const response = await this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
    return response.json();
  }

  async getTournamentParticipants(tournamentId: number) {
    const response = await this.request(`/api/tournaments/${tournamentId}/participants`);
    return response.json();
  }

  async joinTournament(tournamentId: number) {
    const response = await this.request(`/api/tournaments/${tournamentId}/join`, {
      method: 'POST'
    });
    return response.json();
  }

  async createTournament(data: {
    name: string;
    maxParticipants: number;
    startTime?: string;
  }) {
    const response = await this.request('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify(data)
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

  async getGameHistory(params: {
    page?: number;
    limit?: number;
    status?: string;
    gameMode?: string;
  } = {}): Promise<GameHistoryResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.gameMode) queryParams.append('gameMode', params.gameMode);
    
    const queryString = queryParams.toString();
    const endpoint = `/api/users/games/history${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request(endpoint);
    return response.json();
  }

  // ============ MÉTHODES DE JEU ============

  async completeGame(gameData: {
    player2_id?: number | null;
    ai_opponent?: boolean;
    ai_level?: number | null;
    score_player1: number;
    score_player2: number;
    winner_id?: number | null;
    duration: number; // en secondes
    game_mode?: string;
    tournament_id?: number | null;
  }) {
    const response = await this.request('/api/games/complete', {
      method: 'POST',
      body: JSON.stringify(gameData)
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
