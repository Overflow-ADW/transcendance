/**
 * Événements émis par le gestionnaire de données 4 joueurs
 */
export enum FourPlayerGameEvents {
    PLAYER_ELIMINATED = 'player_eliminated',     // Un joueur a été éliminé
    GAME_STATE_CHANGED = 'game_state_changed',   // Changement d'état de jeu
    GAME_RESET = 'game_reset',                   // Réinitialisation du jeu
    PLAYER_WON = 'player_won',                   // Un joueur a gagné
    LAST_TWO_PLAYERS = 'last_two_players'        // Il ne reste que 2 joueurs
}

/**
 * États possibles du jeu 4 joueurs
 */
export enum FourPlayerGameState {
    IDLE = 'idle',
    PLAYING = 'playing',
    GAME_OVER = 'game_over'
}

/**
 * Interface pour un joueur dans le mode 4 joueurs
 */
export interface FourPlayerInfo {
    id: number;
    name: string;
    color: string;
    isActive: boolean;
    isEliminated: boolean;
}

/**
 * Interface de configuration du jeu 4 joueurs
 */
export interface FourPlayerGameConfig {
    players: FourPlayerInfo[];
}

/**
 * Simple EventEmitter pour le frontend
 */
class SimpleEventEmitter {
    private events: { [key: string]: Function[] } = {};

    on(event: string, callback: Function): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event: string, ...args: any[]): void {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(...args));
        }
    }

    removeAllListeners(): void {
        this.events = {};
    }
}

/**
 * Classe pour gérer les données du jeu Pong à 4 joueurs
 */
export class FourPlayerData extends SimpleEventEmitter {
    private _players: FourPlayerInfo[] = [];
    private _gameState: FourPlayerGameState = FourPlayerGameState.IDLE;
    private _winner: number = -1;
    private _activePlayers: number[] = [];

    constructor(config: FourPlayerGameConfig) {
        super();
        this._players = config.players.map(p => ({ ...p }));
        this._activePlayers = this._players
            .filter(p => p.isActive && !p.isEliminated)
            .map(p => p.id);
    }

    /**
     * Élimine un joueur
     * @param playerId ID du joueur à éliminer
     */
    public eliminatePlayer(playerId: number): void {
        const player = this._players.find(p => p.id === playerId);
        if (player && !player.isEliminated) {
            player.isEliminated = true;
            this._activePlayers = this._activePlayers.filter(id => id !== playerId);
            
            console.log(`Joueur ${player.name} (${playerId}) éliminé`);
            this.emit(FourPlayerGameEvents.PLAYER_ELIMINATED, playerId, player.name);
            
            // Vérifier les conditions de fin de jeu
            this.checkGameState();
        }
    }

    /**
     * Vérifie l'état du jeu et émet les événements appropriés
     */
    private checkGameState(): void {
        const activeCount = this._activePlayers.length;
        
        if (activeCount === 1) {
            // Un seul joueur restant = victoire
            const winnerId = this._activePlayers[0];
            const winner = this._players.find(p => p.id === winnerId);
            
            this._winner = winnerId;
            this._gameState = FourPlayerGameState.GAME_OVER;
            
            console.log(`Victoire du joueur ${winner?.name} (${winnerId})`);
            this.emit(FourPlayerGameEvents.GAME_STATE_CHANGED, FourPlayerGameState.GAME_OVER);
            this.emit(FourPlayerGameEvents.PLAYER_WON, winnerId, winner?.name);
        } else if (activeCount === 2) {
            // Plus que 2 joueurs
            this.emit(FourPlayerGameEvents.LAST_TWO_PLAYERS, this._activePlayers);
        }
    }

    /**
     * Démarre le jeu
     */
    public startGame(): void {
        if (this._gameState !== FourPlayerGameState.PLAYING) {
            this._gameState = FourPlayerGameState.PLAYING;
            this.emit(FourPlayerGameEvents.GAME_STATE_CHANGED, FourPlayerGameState.PLAYING);
        }
    }

    /**
     * Réinitialise le jeu
     */
    public resetGame(): void {
        // Réactiver tous les joueurs
        this._players.forEach(player => {
            if (player.isActive) {
                player.isEliminated = false;
            }
        });
        
        this._activePlayers = this._players
            .filter(p => p.isActive && !p.isEliminated)
            .map(p => p.id);
        
        this._winner = -1;
        this._gameState = FourPlayerGameState.IDLE;
        
        this.emit(FourPlayerGameEvents.GAME_RESET);
    }

    /**
     * Obtient les informations d'un joueur
     */
    public getPlayer(playerId: number): FourPlayerInfo | undefined {
        return this._players.find(p => p.id === playerId);
    }

    /**
     * Vérifie si un joueur est actif
     */
    public isPlayerActive(playerId: number): boolean {
        return this._activePlayers.includes(playerId);
    }

    /**
     * Obtient la liste des joueurs actifs
     */
    public getActivePlayers(): number[] {
        return [...this._activePlayers];
    }

    /**
     * Obtient un joueur actif aléatoire (pour direction initiale de la balle)
     */
    public getRandomActivePlayer(): number {
        const activeIds = this.getActivePlayers();
        if (activeIds.length === 0) return 0;
        return activeIds[Math.floor(Math.random() * activeIds.length)];
    }

    // Getters
    get players(): FourPlayerInfo[] {
        return this._players.map(p => ({ ...p }));
    }

    get gameState(): FourPlayerGameState {
        return this._gameState;
    }

    get winner(): number {
        return this._winner;
    }

    get activePlayersCount(): number {
        return this._activePlayers.length;
    }
}