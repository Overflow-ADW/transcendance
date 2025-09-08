// Use local EventEmitter instead of Node.js events module
import { EventEmitter } from './eventEmitter';
import { apiClient } from '../../lib_front/api';

/**
 * Types de jeu disponibles
 */
export enum GameType {
    DEFAULT_PONG = 0,
    MULTIPLAYER_PONG = 1
}

/**
 * États possibles du jeu
 */
export enum GameState {
    IDLE = 'idle',         // En attente de démarrage
    PLAYING = 'playing',   // Partie en cours
    PAUSED = 'paused',     // Partie en pause
    GAME_OVER = 'game_over' // Partie terminée
}

/**
 * Événements émis par le gestionnaire de données
 */
export enum GameEvents {
    SCORE_CHANGED = 'score_changed',         // Changement de score
    GAME_STATE_CHANGED = 'game_state_changed', // Changement d'état de jeu
    GAME_RESET = 'game_reset',               // Réinitialisation du jeu
    PLAYER_WON = 'player_won',               // Un joueur a gagné
    GAME_TYPE_CHANGED = 'game_type_changed'  // Type de jeu modifié
}

/**
 * Interface de configuration du jeu
 */
export interface GameConfig {
    maxScore: number;          // Score maximum pour gagner
    gameType: GameType;        // Type de jeu
    player0Name: string;       // Nom du joueur 0
    player1Name: string;       // Nom du joueur 1
}

/**
 * Classe principale pour gérer les données du jeu Pong
 */
export class PongData extends EventEmitter {
    private _player0Score = 0;
    private _player1Score = 0;
    private _player0Name: string;
    private _player1Name: string;
    private _gameState: GameState = GameState.IDLE;
    private _gameType: GameType;
    private _maxScore: number;
    private _winner = -1; // -1 = no winner, 0 = player 0, 1 = player 1
    private _gameStartTime: Date | null = null;
    private _isAiOpponent = false;
    private _aiLevel: number | null = null;
    private _tournamentId: number | null = null;

    /**
     * Constructeur
     * @param config Configuration du jeu
     */
    constructor(config: GameConfig = {
        maxScore: 10,
        gameType: GameType.DEFAULT_PONG,
        player0Name: "Player 0",
        player1Name: "Player 1"
    }) {
        super();
        this._maxScore = config.maxScore;
        this._gameType = config.gameType;
        this._player0Name = config.player0Name;
        this._player1Name = config.player1Name;
    }

    /**
     * Réinitialise les données du jeu
     */
    public resetGame(): void {
        this._player0Score = 0;
        this._player1Score = 0;
        this._winner = -1;
        this.gameState = GameState.IDLE;
        this.emit(GameEvents.GAME_RESET);
    }

    /**
     * Incrémente le score du joueur 0
     */
    public scorePlayer0(): void {
        // Incrémenter d'abord le score
        this._player0Score++;
        console.log(`Player 0 a marqué! Nouveau score: ${this._player0Score}`);
        
        // Émettre l'événement avec les nouveaux scores
        this.emit(GameEvents.SCORE_CHANGED, {
            player0: this._player0Score,
            player1: this._player1Score
        });

        // Vérifier la condition de victoire
        this.checkWinCondition();
    }

    /**
     * Incrémente le score du joueur 1
     */
    public scorePlayer1(): void {
        // Incrémenter d'abord le score
        this._player1Score++;
        console.log(`Player 1 a marqué! Nouveau score: ${this._player1Score}`);
        
        // Émettre l'événement avec les nouveaux scores
        this.emit(GameEvents.SCORE_CHANGED, {
            player0: this._player0Score,
            player1: this._player1Score
        });

        // Vérifier la condition de victoire
        this.checkWinCondition();
    }

    /**
     * Vérifie si un joueur a atteint le score maximum
     */
    private checkWinCondition(): void {
        console.log(`Vérification victoire: ${this._player0Score}/${this._maxScore} - ${this._player1Score}/${this._maxScore}`);
        
        if (this._player0Score >= this._maxScore) {
            this._winner = 0;
            // Changer directement l'état à GAME_OVER pour arrêter la balle et les contrôles
            this._gameState = GameState.GAME_OVER;
            this.emit(GameEvents.GAME_STATE_CHANGED, GameState.GAME_OVER);
            console.log(`Joueur 0 (${this._player0Name}) a gagné! État du jeu: ${this._gameState}`);
            this.emit(GameEvents.PLAYER_WON, 0, this._player0Name);
            
            // Sauvegarder automatiquement les résultats de la partie
            this.saveGameResults();
            
        } else if (this._player1Score >= this._maxScore) {
            this._winner = 1;
            // Changer directement l'état à GAME_OVER pour arrêter la balle et les contrôles
            this._gameState = GameState.GAME_OVER;
            this.emit(GameEvents.GAME_STATE_CHANGED, GameState.GAME_OVER);
            console.log(`Joueur 1 (${this._player1Name}) a gagné! État du jeu: ${this._gameState}`);
            this.emit(GameEvents.PLAYER_WON, 1, this._player1Name);
            
            // Sauvegarder automatiquement les résultats de la partie
            this.saveGameResults();
        }
    }

    /**
     * Démarre le jeu
     */
    public startGame(): void {
        if (this._gameState !== GameState.PLAYING) {
            this._gameStartTime = new Date();
            this.gameState = GameState.PLAYING;
        }
    }

    /**
     * Met le jeu en pause
     */
    public pauseGame(): void {
        if (this._gameState === GameState.PLAYING) {
            this.gameState = GameState.PAUSED;
        }
    }

    /**
     * Reprend le jeu après une pause
     */
    public resumeGame(): void {
        if (this._gameState === GameState.PAUSED) {
            this.gameState = GameState.PLAYING;
        }
    }

    /**
     * Change le type de jeu
     * @param type Nouveau type de jeu
     */
    public setGameType(type: GameType): void {
        // Seulement si le type est différent
        if (this._gameType !== type) {
            const oldType = this._gameType;
            this._gameType = type;
            
            // Émettre l'événement avec l'ancien et le nouveau type
            this.emit(GameEvents.GAME_TYPE_CHANGED, type, oldType);
            console.log(`Type de jeu changé: ${GameType[oldType]} -> ${GameType[type]}`);
        }
    }

    /**
     * Définit les noms des joueurs
     * @param player0 Nom du joueur 0
     * @param player1 Nom du joueur 1
     */
    public setPlayerNames(player0: string, player1: string): void {
        this._player0Name = player0;
        this._player1Name = player1;
    }

    /**
     * Définit le score maximum
     * @param maxScore Nouveau score maximum
     */
    public setMaxScore(maxScore: number): void {
        this._maxScore = maxScore;
    }

    // Getters
    get player0Score(): number {
        return this._player0Score;
    }

    get player1Score(): number {
        return this._player1Score;
    }

    get player0Name(): string {
        return this._player0Name;
    }

    get player1Name(): string {
        return this._player1Name;
    }

    get gameState(): GameState {
        return this._gameState;
    }

    set gameState(state: GameState) {
        if (this._gameState !== state) {
            this._gameState = state;
            this.emit(GameEvents.GAME_STATE_CHANGED, state);
        }
    }

    get gameType(): GameType {
        return this._gameType;
    }

    get maxScore(): number {
        return this._maxScore;
    }

    get winner(): number {
        return this._winner;
    }

    // ============ MÉTHODES DE CONFIGURATION ============

    /**
     * Configure une partie contre l'IA
     */
    public setupAiGame(aiLevel: number): void {
        this._isAiOpponent = true;
        this._aiLevel = aiLevel;
    }

    /**
     * Configure une partie de tournoi
     */
    public setupTournamentGame(tournamentId: number): void {
        this._tournamentId = tournamentId;
    }

    // ============ SAUVEGARDE AUTOMATIQUE ============

    /**
     * Sauvegarde les résultats de la partie terminée
     */
    private async saveGameResults(): Promise<void> {
        if (this._winner === -1 || !this._gameStartTime) {
            console.warn('Impossible de sauvegarder: partie non terminée ou pas de temps de début');
            return;
        }

        try {
            const duration = Math.round((new Date().getTime() - this._gameStartTime.getTime()) / 1000);
            const winnerId = this._winner; // 0 ou 1 pour indiquer le gagnant
            
            const gameData = {
                player2_id: this._isAiOpponent ? null : undefined, // null si IA, undefined pour joueur réel (sera déterminé côté backend)
                ai_opponent: this._isAiOpponent,
                ai_level: this._aiLevel,
                score_player1: this._winner === 0 ? this._player0Score : this._player1Score,
                score_player2: this._winner === 0 ? this._player1Score : this._player0Score,
                winner_id: winnerId, 
                duration: duration,
                game_mode: 'classic',
                tournament_id: this._tournamentId
            };

            console.log('🎮 Sauvegarde des résultats de partie:', gameData);
            const result = await apiClient.saveGameResults(gameData);
            console.log('✅ Partie sauvegardée avec succès:', result);
            
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde de la partie:', error);
        }
    }
}