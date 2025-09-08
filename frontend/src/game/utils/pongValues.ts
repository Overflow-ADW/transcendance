/**
 * Configuration constants for the Pong game
 */

import { Color3 } from "@babylonjs/core";
import { GameType } from "@/game/utils/pongData";

// Game Dimensions - Common to all game modes
export const GAME_DIMENSIONS = {
    WIDTH: 1000,
    HEIGHT: 600
};

// Camera Settings - Common to all game modes
export const CAMERA_CONFIG = {
    HEIGHT: 1000,
    ROTATION_DEGREES: 90
};

// Lighting - Common to all game modes
export const LIGHT_CONFIG = {
    INTENSITY: 0.5
};

// Wall Settings - Common to all game modes
export const WALL_CONFIG = {
    WIDTH: 1000,
    HEIGHT: 10,
    DEPTH: 10,
    TOP_POSITION_Z: 300,
    BOTTOM_POSITION_Z: -300,
    POSITION_Y: 0
};

// Player Settings - Common to all game modes
export const PLAYER_CONFIG = {
    WIDTH: 10,
    HEIGHT: 10,
    DEPTH: 90,
    POSITION_Y: 10,
    PLAYER0_POSITION_X: -490,
    PLAYER1_POSITION_X: 490,
    INITIAL_POSITION_Z: 0
};

// Ball Settings - Can vary by game mode
export const BALL_CONFIG = {
    DIAMETER: 20,
    POSITION_Y: 0,
    INITIAL_POSITION: {
        X: 0,
        Y: 0,
        Z: 0
    },
    PHYSICS: {
        INITIAL_SPEED: 3,
        SPEED_INCREMENT: 0.5,
        MAX_SPEED: 15
    },
    COLLISION_THRESHOLD: 5,
    OUT_OF_BOUNDS_X: 510
};

// Game Colors - Common to all game modes
export const MAIN_COLORS = {
    RGB_BLUE: new Color3(0.137, 0.137, 1),
    HEX_BLUE: "#2323FF",
    RGB_PURPLE: new Color3(0.54, 0, 0.77),
    HEX_PURPLE: "#8A00C4",
    RGB_YELLOW: new Color3(1, 0.843, 0),
    HEX_YELLOW: "#FFD700",
    RGB_GREEN: new Color3(0.157, 0.647, 0.271),
    HEX_GREEN: "#28A745"
};


// Player Controls - Common to all game modes
export const CONTROLS_CONFIG = {
    SPEED: 5,
    MAX_Z: 245,
    MIN_Z: -245,
    KEYS: {
        PLAYER0: {
            UP: ["z", "Z"],
            DOWN: ["s", "S"]
        },
        PLAYER1: {
            UP: ["o", "O"],
            DOWN: ["l", "L"]
        },
        PLAYER2: {
            UP: ["i", "I"],
            DOWN: ["k", "K"]
        },
        PLAYER3: {
            UP: ["Numpad8", "8"],
            DOWN: ["Numpad5", "5"]
        }
    }
};

// Game Configuration - Common settings but some may vary by game mode
export const GAME_CONFIG = {
    DEFAULT_MAX_SCORE: 5,
    DISPLAY: {
        SCORE_TEXTURE_SIZE: 128,
        SCORE_PLANE_WIDTH: 150,
        SCORE_PLANE_HEIGHT: 150,
        SCORE_PLANE_POSITION_Y: -50,
        SCORE_PLANE_POSITION_X_OFFSET: 250,
        SCORE_FONT_SIZE: 90,
        PLAYER_NAME_FONT_SIZE: 20,
        WINNER_FONT_SIZE: 25
    },
    RESET_DELAY_MS: 3000,
    OPTIMIZATION: {
        WALL_TEXTURE_SIZE: 256,
        PARTICLE_REDUCTION_FACTOR: 0.6,
        UPDATE_INTERVAL: 33,
        GLOW_BLUR_KERNEL: 16
    }
};

// Interface pour définir la structure d'une configuration de mode de jeu
interface GameModeConfig {
    BALL_PHYSICS: {
        INITIAL_SPEED: number;
        SPEED_INCREMENT: number;
        MAX_SPEED: number;
    };
    CONTROLS?: {
        SPEED: number;
    };
}

// Mode-specific configurations - Seulement DEFAULT_PONG et MULTIPLAYER_PONG
export const GAME_MODE_CONFIGS: Record<GameType, GameModeConfig> = {
    [GameType.DEFAULT_PONG]: {
        // Default mode uses the standard configurations above
        BALL_PHYSICS: {
            INITIAL_SPEED: BALL_CONFIG.PHYSICS.INITIAL_SPEED,
            SPEED_INCREMENT: BALL_CONFIG.PHYSICS.SPEED_INCREMENT,
            MAX_SPEED: BALL_CONFIG.PHYSICS.MAX_SPEED
        }
    },
    [GameType.MULTIPLAYER_PONG]: {
        // Multiplayer mode - Same physics as default
        BALL_PHYSICS: {
            INITIAL_SPEED: BALL_CONFIG.PHYSICS.INITIAL_SPEED,
            SPEED_INCREMENT: BALL_CONFIG.PHYSICS.SPEED_INCREMENT,
            MAX_SPEED: BALL_CONFIG.PHYSICS.MAX_SPEED
        },
        CONTROLS: {
            SPEED: CONTROLS_CONFIG.SPEED
        }
    }
};

// Helper function to get configuration for a specific game mode
export function getGameModeConfig(gameType: GameType): GameModeConfig {
    return GAME_MODE_CONFIGS[gameType] || GAME_MODE_CONFIGS[GameType.DEFAULT_PONG];
}