// EventEmitter custom a la place de Node.js
import { EventEmitter } from './eventEmitter';

export enum GameType {
    DEFAULT_PONG = 0,
    MULTIPLAYER_PONG = 1
}

export enum GameState {
    IDLE = 'idle',
    PLAYING = 'playing',
    PAUSED = 'paused',
    GAME_OVER = 'game_over'
}

export enum GameEvents {
    SCORE_CHANGED = 'score_changed',
    GAME_STATE_CHANGED = 'game_state_changed',
    GAME_RESET = 'game_reset',
    PLAYER_WON = 'player_won',
    GAME_TYPE_CHANGED = 'game_type_changed'
}

export interface GameConfig {
    maxScore: number;
    gameType: GameType;
    player0Name: string;
    player1Name: string;
}

export class PongData extends EventEmitter {
    private _player0Score = 0;
    private _player1Score = 0;
    private _player0Name: string;
    private _player1Name: string;
    private _gameState: GameState = GameState.IDLE;
    private _gameType: GameType;
    private _maxScore: number;
    private _winner = -1;

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

    public resetGame(): void {
        this._player0Score = 0;
        this._player1Score = 0;
        this._winner = -1;
        this.gameState = GameState.IDLE;
        this.emit(GameEvents.GAME_RESET);
    }

    public scorePlayer0(): void {
        this._player0Score++;
        console.log(`Player 0 a marqué. Nouveau score: ${this._player0Score}`);
        
        this.emit(GameEvents.SCORE_CHANGED, {
            player0: this._player0Score,
            player1: this._player1Score
        });
        this.checkWinCondition();
    }

    public scorePlayer1(): void {
        this._player1Score++;
        console.log(`Player 1 a marqué. Nouveau score: ${this._player1Score}`);

        this.emit(GameEvents.SCORE_CHANGED, {
            player0: this._player0Score,
            player1: this._player1Score
        });
        this.checkWinCondition();
    }

    private checkWinCondition(): void {
        console.log(`Vérification victoire: ${this._player0Score}/${this._maxScore} - ${this._player1Score}/${this._maxScore}`);
        
        if (this._player0Score >= this._maxScore) {
            this._winner = 0;
            this._gameState = GameState.GAME_OVER;
            this.emit(GameEvents.GAME_STATE_CHANGED, GameState.GAME_OVER);
            this.emit(GameEvents.PLAYER_WON, 0, this._player0Name);
        } else if (this._player1Score >= this._maxScore) {
            this._winner = 1;
            this._gameState = GameState.GAME_OVER;
            this.emit(GameEvents.GAME_STATE_CHANGED, GameState.GAME_OVER);
            this.emit(GameEvents.PLAYER_WON, 1, this._player1Name);
        }
    }

    public startGame(): void {
        if (this._gameState !== GameState.PLAYING) {
            this.gameState = GameState.PLAYING;
        }
    }

    public pauseGame(): void {
        if (this._gameState === GameState.PLAYING) {
            this.gameState = GameState.PAUSED;
        }
    }

    public resumeGame(): void {
        if (this._gameState === GameState.PAUSED) {
            this.gameState = GameState.PLAYING;
        }
    }

    public setGameType(type: GameType): void {
        if (this._gameType !== type) {
            const oldType = this._gameType;
            this._gameType = type;
            
            this.emit(GameEvents.GAME_TYPE_CHANGED, type, oldType);
            console.log(`Type de jeu changé: ${GameType[oldType]} -> ${GameType[type]}`);
        }
    }

    public setPlayerNames(player0: string, player1: string): void {
        this._player0Name = player0;
        this._player1Name = player1;
    }

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
}