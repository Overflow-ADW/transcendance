// src/lib_front/types.ts

export type Lang = "fr" | "en" | "nl";

export type View =
  | "home"
  | "signin"
  | "login"
  | "settings"
  | "play"
  | "chooseIA"
  | "game"
  | "tournament"
  | "duel"
  | "profileView";

export type Difficulty = "easy" | "medium" | "hard";

// ============ TYPES JEUX ET HISTORIQUE ============

export interface Game {
  id: number;
  player1_id: number;
  player2_id: number | null;
  score_player1: number;
  score_player2: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  game_mode: 'classic' | 'tournament';
  duration: number;
  created_at: string;
  start_time?: string;
  end_time?: string;
  winner_id: number | null;
  player1_username: string;
  player1_display_name: string;
  player1_avatar: string | null;
  player2_username: string | null;
  player2_display_name: string | null;
  player2_avatar: string | null;
  result: 'win' | 'loss' | 'draw' | 'pending';
  user_score: number;
  opponent_score: number;
  opponent_username: string | null;
  opponent_display_name: string | null;
  opponent_avatar?: string | null;
}

export interface GameHistoryResponse {
  games: Game[];
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextPage: number | null;
    previousPage: number | null;
  };
  stats: {
    wins: number;
    losses: number;
    draws: number;
    pending: number;
  };
  filters: {
    status: string;
    gameMode: string;
  };
}

export interface GameStats {
  global: {
    total_games: number;
    completed_games: number;
    games_won: number;
    games_lost: number;
    games_drawn: number;
    ongoing_games: number;
    winrate: number;
    avgDuration: number;
    highestScore: number;
    winRates: {
      vsAI: number;
      vsPlayers: number;
      tournaments: number;
    };
    gamesByType: {
      vsAI: number;
      vsPlayers: number;
      tournaments: number;
    };
  };
  byGameType?: Array<{
    game_mode: string;
    games_count: number;
    wins: number;
    winrate: number;
    avgDurationMinutes: number;
  }>;
  recentOpponents?: Array<{
    opponent_username: string;
    opponent_display_name: string;
    games_played: number;
    wins_against: number;
    winrateAgainst: number;
    last_game: string;
  }>;
}

// ============ TYPES EXISTANTS ============

export type Player = {
  id: string;
  name: string;
};

export type Winrate = {
  label: string;
  value: number;            // 0..100
  color: string;            // classes tailwind (ex: "bg-purple-600")
};

export type MatchItem = {
  opponent: string;
  result: "win" | "loose";
  mode: "1 vs 1" | "tournament" | "vs ia";
};

// ============ TYPES AMIS/FRIENDS ============

export interface Friend {
  id: number; // ID de la relation d'amitié (friendship_id)
  user_id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  friendship_status: 'accepted';
  online_status: 'online' | 'offline';
}

export interface PendingInvitation {
  friendship_id: number;
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  request_type: 'incoming' | 'outgoing';
  requested_at: string;
  requester_username?: string;
  target_username?: string;
}

export interface FriendsResponse {
  friends: Friend[];
  pendingRequests: PendingInvitation[];
  stats: {
    totalFriends: number;
    onlineFriends: number;
    pendingIncoming: number;
    pendingOutgoing: number;
  };
}

export interface UserSearchResult {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  friendship_status?: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked';
  mutual_friends?: number;
}

export interface SearchUsersResponse {
  query: string;
  results: UserSearchResult[];
  count: number;
}
