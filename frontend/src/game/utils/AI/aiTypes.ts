import { Vector3 } from "@babylonjs/core";

/**
 * Niveaux de difficulté de l'IA
 */
export enum AIDifficulty {
    EASY = 1,
    MEDIUM = 2,
    HARD = 3
}

/**
 * Modes de l'IA
 */
export enum AIMode {
    DEFENSIVE = "DEFENSIVE",
    OFFENSIVE = "OFFENSIVE"
}

/**
 * Snapshot de l'état de la balle pour les prédictions
 */
export interface BallSnapshot {
    position: Vector3;
    velocity: Vector3;
    timestamp: number;
    reason: string;
}

/**
 * Configuration de l'IA selon la difficulté
 */
export interface AIConfig {
    useSnapshotSystem: boolean;
    precisionFactor: number;
    reactionTime: number;
    positionError: number;
    anticipationRange: number;
    movementSpeed: number;
}

/**
 * Interface pour les snapshots en file d'attente
 */
export interface PendingSnapshot {
    reason: string;
    timestamp: number;
    ballPosition: Vector3;
    ballVelocity: Vector3;
    priority: number;
}

/**
 * Interface pour les vues du jeu en cache
 */
export interface CachedGameView {
    ballPosition: Vector3;
    ballVelocity: Vector3;
    aiPosition: number;
    timestamp: number;
}
