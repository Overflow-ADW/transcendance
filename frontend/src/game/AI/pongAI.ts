import { Vector3, Mesh } from "@babylonjs/core";
import { GameState } from "@/game/utils/pongData";
import { PLAYER_CONFIG, CONTROLS_CONFIG, WALL_CONFIG, BALL_CONFIG } from "@/game/utils/pongValues";
import { AIDifficulty, AIConfig } from "./aiTypes";
import { AI_CONFIGS, getDifficultyName } from "./aiConfig";
import { KeyboardSimulator } from "./keyboardSimulator";

export { AIDifficulty, KeyboardSimulator };

/**
 * IA PONG INTELLIGENTE - SYSTÈME CORRIGÉ POUR TRAJECTOIRE PARFAITE
 * 
 * CORRECTIONS MAJEURES :
 * - Détection fiable des changements de direction 
 * - Calcul de vélocité précis en X et Z
 * - Simulation de trajectoire avec rebonds corrects
 * - Snapshots garantis lors des événements critiques
 */
export class PongAI {
    private difficulty: AIDifficulty = AIDifficulty.MEDIUM;
    private config: AIConfig = AI_CONFIGS[AIDifficulty.MEDIUM];
    private isActive = false;
    
    private lastSnapshot: {
        position: Vector3;
        velocity: Vector3;
        timestamp: number;
        reason: string;
        interceptPoint: number;
    } | null = null;
    private lastSnapshotTime = 0;
    
    private getSnapshotInterval(): number {
        return this.config.reactionTime;
    }

    private lastBallPosition: Vector3 | null = null;
    private lastBallTimestamp = 0;
    private lastBallVelocityX = 0;
    private ballTowardsAI = false;
    private targetPosition = 0;
    private currentMode: 'DEFENSIVE' | 'INTERCEPTION' = 'DEFENSIVE';
    private currentKey: 'UP' | 'DOWN' | 'NONE' = 'NONE';
    private lastKeyChangeTime = 0;
    
    constructor(
        private player1: Mesh,
        private ball: Mesh,
        private gameState: () => GameState,
        private keySimulator: KeyboardSimulator,
        difficulty: AIDifficulty = AIDifficulty.MEDIUM
    ) {
        this.setDifficulty(difficulty);
        this.targetPosition = 0;
    }

    public setDifficulty(difficulty: AIDifficulty): void {
        this.difficulty = difficulty;
        this.config = AI_CONFIGS[difficulty];
    }

    public getDifficulty(): AIDifficulty {
        return this.difficulty;
    }

    public getDifficultyName(): string {
        return getDifficultyName(this.difficulty);
    }

    public activate(): void {
        this.isActive = true;
        this.reset();
    }

    public deactivate(): void {
        this.isActive = false;
        this.stopMovement();
    }

    public isAIActive(): boolean {
        return this.isActive;
    }

    public update(): void {
        if (!this.isActive || this.gameState() !== GameState.PLAYING) {
            this.stopMovement();
            return;
        }

        this.detectDirectionChange();
        
        this.analyzeAndDecide();
        
        this.executeMovement();
    }


    private detectDirectionChange(): void {
        const ballPos = this.ball.position.clone();
        const currentVelX = this.calculateCurrentVelocityX(ballPos);

        if (Math.abs(ballPos.x) > BALL_CONFIG.OUT_OF_BOUNDS_X) {
            this.ballTowardsAI = false;
            return;
        }
        if (currentVelX < -50) {
            this.ballTowardsAI = false;
            this.currentMode = 'DEFENSIVE';
            this.targetPosition = 0;
            this.lastBallPosition = ballPos.clone();
            this.lastBallVelocityX = currentVelX;
            this.lastBallTimestamp = performance.now();
            return;
        }
        
        if (!this.canCreateSnapshot()) {
            this.lastBallPosition = ballPos.clone();
            this.lastBallVelocityX = currentVelX;
            this.lastBallTimestamp = performance.now();
            return;
        }
        
        const leftZoneLimit = -200;
        const rightZoneLimit = 200;
        
        const isInLeftZone = ballPos.x < leftZoneLimit;
        const isInMiddleZone = ballPos.x >= leftZoneLimit && ballPos.x <= rightZoneLimit;
        const isInRightZone = ballPos.x > rightZoneLimit;
        
        const wasInLeftZone = this.lastBallPosition ? this.lastBallPosition.x < leftZoneLimit : false;
        const wasInMiddleZone = this.lastBallPosition ? 
            (this.lastBallPosition.x >= leftZoneLimit && this.lastBallPosition.x <= rightZoneLimit) : false;
        
        // Vérifier que la balle va vers l'IA (vélocité positive) avant de créer un snapshot
        if (wasInLeftZone && isInMiddleZone && currentVelX > 50) {
            if (!this.ballTowardsAI) {
                const fullVelocity = this.estimateFullVelocity(ballPos);
                if (fullVelocity.x <= 0) {
                    fullVelocity.x = Math.max(250, Math.abs(currentVelX));
                }
                this.createSnapshot(ballPos, fullVelocity, "ZONE_LEFT_TO_MIDDLE");
                this.ballTowardsAI = true;
                this.lastBallVelocityX = fullVelocity.x;
                return;
            }
        }

        if (wasInMiddleZone && isInRightZone && currentVelX > 50) {
            if (!this.ballTowardsAI) {
                const fullVelocity = this.estimateFullVelocity(ballPos);
                if (fullVelocity.x <= 0) {
                    fullVelocity.x = Math.max(250, Math.abs(currentVelX));
                }
                this.createSnapshot(ballPos, fullVelocity, "ZONE_MIDDLE_TO_RIGHT");
                this.ballTowardsAI = true;
                this.lastBallVelocityX = fullVelocity.x;
                return;
            }
        }

        const isNearPlayer0 = Math.abs(ballPos.x - PLAYER_CONFIG.PLAYER0_POSITION_X) < 60;
        
        if (isNearPlayer0 && currentVelX > 50) {
            const fullVelocity = this.estimateFullVelocity(ballPos);
            if (fullVelocity.x <= 0) {
                fullVelocity.x = Math.max(200, currentVelX);
            }
            this.createSnapshot(ballPos, fullVelocity, "PLAYER0_BOUNCE");
            this.ballTowardsAI = true;
            this.lastBallVelocityX = currentVelX;
            return;
        }

        const wasGoingAwayOrStopped = this.lastBallVelocityX <= 50;
        const nowGoingTowardsAI = currentVelX > 50;
        
        if (wasGoingAwayOrStopped && nowGoingTowardsAI && !this.ballTowardsAI) {
            const fullVelocity = this.estimateFullVelocity(ballPos);
            if (fullVelocity.x <= 0) {
                fullVelocity.x = Math.max(200, currentVelX);
            }
            this.createSnapshot(ballPos, fullVelocity, "VELOCITY_CHANGE");
            this.ballTowardsAI = true;
        }
        
        this.lastBallPosition = ballPos.clone();
        this.lastBallVelocityX = currentVelX;
        this.lastBallTimestamp = performance.now();
    }

    private calculateCurrentVelocityX(currentPos: Vector3): number {
        if (!this.lastBallPosition || !this.lastBallTimestamp) {
            this.lastBallPosition = currentPos.clone();
            this.lastBallTimestamp = performance.now();
            return 0;
        }
        
        const deltaTime = (performance.now() - this.lastBallTimestamp) / 1000;
        
        if (deltaTime > 0.01) {
            const deltaX = currentPos.x - this.lastBallPosition.x;
            const velocityX = deltaX / deltaTime;
            return velocityX;
        }
        
        return this.lastBallVelocityX;
    }

    private estimateFullVelocity(currentPos: Vector3): Vector3 {
        if (!this.lastBallPosition || !this.lastBallTimestamp) {
            this.lastBallPosition = currentPos.clone();
            this.lastBallTimestamp = performance.now();
            return new Vector3(0, 0, 0);
        }
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastBallTimestamp) / 1000;
        
        if (deltaTime > 0.01) {
            const deltaPos = currentPos.subtract(this.lastBallPosition);
            const velocity = deltaPos.scale(1 / deltaTime);
            this.lastBallPosition = currentPos.clone();
            this.lastBallTimestamp = currentTime;
            return velocity;
        }
        if (this.lastSnapshot) {
            return this.lastSnapshot.velocity.clone();
        }
        
        return new Vector3(this.lastBallVelocityX, 0, 0);
    }

    private createSnapshot(position: Vector3, velocity: Vector3, reason: string): void {
        const timestamp = performance.now();
        
        const interceptPoint = this.calculatePerfectTrajectory(position, velocity);
        
        this.lastSnapshot = {
            position: position.clone(),
            velocity: velocity.clone(),
            timestamp: timestamp,
            reason: reason,
            interceptPoint: interceptPoint
        };
        
        this.lastSnapshotTime = timestamp;
        
        console.log(`SNAPSHOT: ${reason}`);
        console.log(` Position: (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
        console.log(` Vélocité: (${velocity.x.toFixed(1)}, ${velocity.z.toFixed(1)})`);
        console.log(` Point d'interception: ${interceptPoint.toFixed(1)}`);
    }

    private calculatePerfectTrajectory(ballPos: Vector3, ballVel: Vector3): number {
        if (ballVel.x <= 0) {
            return 0;
        }
        
        const aiX = PLAYER_CONFIG.PLAYER1_POSITION_X;
        
        const ballRadius = BALL_CONFIG.DIAMETER / 2;
        const wallTop = WALL_CONFIG.TOP_POSITION_Z - ballRadius;
        const wallBottom = WALL_CONFIG.BOTTOM_POSITION_Z + ballRadius;

        const timeToReach = (aiX - ballPos.x) / ballVel.x;
        
        if (timeToReach <= 0) {
            return 0;
        }
        
        let currentZ = ballPos.z;
        let currentVelZ = ballVel.z;
        let timeRemaining = timeToReach;
        let bounceCount = 0;
        
        for (let i = 0; i < 20 && timeRemaining > 0; i++) {
            if (Math.abs(currentVelZ) < 0.1) {
                break;
            }
            
            let timeToWall: number;
            let wallZ: number;
            
            if (currentVelZ > 0) {
                timeToWall = (wallTop - currentZ) / currentVelZ;
                wallZ = wallTop;
            } else {
                timeToWall = (wallBottom - currentZ) / currentVelZ;
                wallZ = wallBottom;
            }
            
            if (timeToWall >= timeRemaining) {
                currentZ += currentVelZ * timeRemaining;
                break;
            } else {
                currentZ = wallZ;
                currentVelZ = -currentVelZ;
                timeRemaining -= timeToWall;
                bounceCount++;
            }
        }
        
        const finalPosition = Math.max(CONTROLS_CONFIG.MIN_Z, Math.min(CONTROLS_CONFIG.MAX_Z, currentZ));
        
        if (finalPosition !== currentZ) {
            console.log(`Position limites de jeu: ${finalPosition.toFixed(1)} (limite: [${CONTROLS_CONFIG.MIN_Z}, ${CONTROLS_CONFIG.MAX_Z}])`);
        }
        
        return finalPosition;
    }

    private canCreateSnapshot(): boolean {
        if (!this.config.useSnapshotSystem) {
            return false;
        }
        const currentInterval = this.getSnapshotInterval();
        const timeSinceLastSnapshot = performance.now() - this.lastSnapshotTime;
        const canCreate = timeSinceLastSnapshot >= currentInterval;
        
        if (!canCreate) {
            const remainingTime = currentInterval - timeSinceLastSnapshot;
        }
        
        return canCreate;
    }

    private analyzeAndDecide(): void {
        if (!this.lastSnapshot) {
            this.currentMode = 'DEFENSIVE';
            this.targetPosition = 0;
            return;
        }

        if (this.ballTowardsAI) {
            this.currentMode = 'INTERCEPTION';
            let targetZ = this.lastSnapshot.interceptPoint;
            
            targetZ += (Math.random() - 0.5) * this.config.positionError;
            
            targetZ *= this.config.precisionFactor;
            
            this.targetPosition = targetZ;
        } else {
            this.currentMode = 'DEFENSIVE';
            this.targetPosition = 0;
        }
    }

    private executeMovement(): void {
        const currentPosition = this.player1.position.z;
        const distance = this.targetPosition - currentPosition;
        const currentTime = performance.now();

        const tolerance = 15.0;
        
        if (Math.abs(distance) < tolerance) {
            this.stopMovement();
            return;
        }

        const direction = distance > 0 ? 'UP' : 'DOWN';

        const baseInterval = 150;
        const minKeyChangeInterval = Math.max(50, baseInterval - (this.config.reactionTime / 10));
        
        const isChangingDirection = (this.currentKey === 'UP' && direction === 'DOWN') || 
                                   (this.currentKey === 'DOWN' && direction === 'UP');
        
        if (isChangingDirection && Math.abs(distance) > this.config.anticipationRange / 3) {
            return;
        }
        
        if (this.currentKey !== direction && (currentTime - this.lastKeyChangeTime) > minKeyChangeInterval) {
            this.keySimulator.releaseAll();
            
            const key = direction === 'UP' ? 'UP' : 'DOWN';
            this.keySimulator.pressKey(key);
            
            this.currentKey = direction;
            this.lastKeyChangeTime = currentTime;
        }
    }

    private stopMovement(): void {
        if (this.currentKey !== 'NONE') {
            this.keySimulator.releaseAll();
            this.currentKey = 'NONE';
        }
    }

    public reset(): void {
        this.stopMovement();
        this.currentMode = 'DEFENSIVE';
        this.targetPosition = 0;
        this.lastSnapshot = null;
        this.lastSnapshotTime = 0;
        this.lastBallVelocityX = 0;
        this.ballTowardsAI = false;
        this.lastBallPosition = null;
        this.lastBallTimestamp = 0;
    }

    public forceSnapshot(): void {
        const ballPos = this.ball.position.clone();
        const ballVel = this.estimateFullVelocity(ballPos);
        
        if (ballVel.x > 0) {
            this.createSnapshot(ballPos, ballVel, "FORCE_START");
            this.ballTowardsAI = true;
        }
    }

    public notifyPlayer0Hit(ballPosition: Vector3, ballVelocity: Vector3): void {
        
        if (ballVelocity.x > 0 && this.canCreateSnapshot()) {
            this.createSnapshot(ballPosition, ballVelocity, "PLAYER0_HIT_DIRECT");
            this.ballTowardsAI = true;
            this.lastBallVelocityX = ballVelocity.x;
        }
    }

    public notifyGameStart(ballPosition: Vector3, ballVelocity: Vector3): void {
        if (ballVelocity.x > 0) {
            this.createSnapshot(ballPosition, ballVelocity, "GAME_START_DIRECT");
            this.ballTowardsAI = true;
            this.lastBallVelocityX = ballVelocity.x;
        } else {
            this.ballTowardsAI = false;
            this.currentMode = 'DEFENSIVE';
            this.targetPosition = 0;
        }
    }

    public getDebugInfo(): string {
        if (!this.isActive) {
            return "IA inactive";
        }
        
        const currentInterval = this.getSnapshotInterval();
        const timeSinceSnapshot = performance.now() - this.lastSnapshotTime;
        const nextSnapshotIn = Math.max(0, currentInterval - timeSinceSnapshot);
        const snapshotAge = this.lastSnapshot ? performance.now() - this.lastSnapshot.timestamp : 0;
        
        return [
            `Mode: ${this.currentMode}`,
            `Snapshot: ${this.lastSnapshot ? this.lastSnapshot.reason : 'AUCUN'}`,
            `Âge: ${snapshotAge.toFixed(0)}ms`,
            `Cible: ${this.targetPosition.toFixed(1)}`,
            `Pos: ${this.player1.position.z.toFixed(1)}`,
            `Prochain: ${nextSnapshotIn.toFixed(0)}ms (${getDifficultyName(this.difficulty)})`
        ].join(' | ');
    }
}