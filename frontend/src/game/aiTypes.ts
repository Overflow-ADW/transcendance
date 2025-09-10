import { Vector3 } from "@babylonjs/core";

export enum AIDifficulty {
    EASY = 1,
    MEDIUM = 2,
    HARD = 3
}

export enum AIMode {
    DEFENSIVE = "DEFENSIVE",
    OFFENSIVE = "OFFENSIVE"
}

export interface BallSnapshot {
    position: Vector3;
    velocity: Vector3;
    timestamp: number;
    reason: string;
}

export interface AIConfig {
    useSnapshotSystem: boolean;
    precisionFactor: number;
    reactionTime: number;
    positionError: number;
    anticipationRange: number;
    movementSpeed: number;
}

export interface PendingSnapshot {
    reason: string;
    timestamp: number;
    ballPosition: Vector3;
    ballVelocity: Vector3;
    priority: number;
}

export interface CachedGameView {
    ballPosition: Vector3;
    ballVelocity: Vector3;
    aiPosition: number;
    timestamp: number;
}
