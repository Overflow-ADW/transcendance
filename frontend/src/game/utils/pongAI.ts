import { Vector3, Mesh } from "@babylonjs/core";
import { GameState } from "@/game/utils/pongData";
import { PLAYER_CONFIG, CONTROLS_CONFIG, WALL_CONFIG, BALL_CONFIG } from "@/game/utils/pongValues";

/**
 * Niveaux de difficulté de l'IA
 */
export enum AIDifficulty {
    VERY_EASY = 1,
    EASY = 2,
    MEDIUM = 3,
    HARD = 4,
    EXTREME = 5
}

/**
 * Configuration de l'IA avec système de prédiction
 */
interface AIConfig {
    precisionFactor: number;    // Facteur de précision (0-1)
    reactionDelay: number;      // Délai de réaction en ms
    positionError: number;      // Erreur de position maximale
    smoothingFactor: number;    // Facteur de lissage des mouvements (0-1)
    anticipationDistance: number; // Distance d'anticipation
}

const AI_CONFIGS: Record<AIDifficulty, AIConfig> = {
    [AIDifficulty.VERY_EASY]: {
        precisionFactor: 0.6,
        reactionDelay: 300,
        positionError: 50,
        smoothingFactor: 0.3,
        anticipationDistance: 200
    },
    [AIDifficulty.EASY]: {
        precisionFactor: 0.75,
        reactionDelay: 200,
        positionError: 30,
        smoothingFactor: 0.5,
        anticipationDistance: 300
    },
    [AIDifficulty.MEDIUM]: {
        precisionFactor: 0.85,
        reactionDelay: 100,
        positionError: 15,
        smoothingFactor: 0.7,
        anticipationDistance: 400
    },
    [AIDifficulty.HARD]: {
        precisionFactor: 0.95,
        reactionDelay: 50,
        positionError: 5,
        smoothingFactor: 0.85,
        anticipationDistance: 500
    },
    [AIDifficulty.EXTREME]: {
        precisionFactor: 1.0,
        reactionDelay: 0,
        positionError: 0,
        smoothingFactor: 0.95,
        anticipationDistance: 600
    }
};

/**
 * Snapshot de l'état de la balle pour les prédictions
 */
interface BallSnapshot {
    position: Vector3;
    velocity: Vector3;
    timestamp: number;
}

/**
 * IA STABLE - Version corrigée sans oscillations
 */
export class PongAI {
    private difficulty: AIDifficulty = AIDifficulty.EXTREME;
    private config: AIConfig = AI_CONFIGS[AIDifficulty.EXTREME];
    private isActive = false;
    
    // Système de snapshots
    private ballSnapshot: BallSnapshot | null = null;
    private lastSnapshotTime = 0;
    private snapshotCooldown = 800; // Réduit pour plus de réactivité
    private previousBallPosition: Vector3 = new Vector3(0, 0, 0);
    
    // Système de mouvement STABLE
    private targetPosition = 0;
    private currentPosition = 0;
    private stableTargetPosition = 0;
    private lastValidTarget = 0;
    private targetStabilityTime = 0;
    private targetStabilityThreshold = 100; // Réduit pour plus de réactivité
    
    // État des contrôles SIMPLIFIÉ
    private currentKey: 'UP' | 'DOWN' | 'NONE' = 'NONE';
    private lastKeyChangeTime = 0;
    private keyChangeDelay = 50; // Beaucoup plus court
    private lastMovementTime = 0;
    
    // Prédiction de trajectoire
    private predictedImpactZ: number | null = null;
    private ballMovingTowardsAI = false;
    private lastBallVelocity: Vector3 = new Vector3(0, 0, 0);
    
    // Système ANTI-OSCILLATION simplifié
    private lastStableDirection: 'UP' | 'DOWN' | 'NONE' = 'NONE';
    private sameDirectionCount = 0;
    private directionLockTime = 0;
    private isDirectionLocked = false;
    
    constructor(
        private player1: Mesh,
        private ball: Mesh,
        private gameState: () => GameState,
        private keySimulator: KeyboardSimulator,
        difficulty: AIDifficulty = AIDifficulty.EXTREME
    ) {
        this.setDifficulty(difficulty);
        this.currentPosition = this.player1.position.z;
        this.targetPosition = this.currentPosition;
        this.stableTargetPosition = this.currentPosition;
        this.lastValidTarget = this.currentPosition;
        this.previousBallPosition = this.ball.position.clone();
        console.log(`🤖 IA STABLE créée - Difficulté: ${this.getDifficultyName()}`);
    }
    
    /**
     * MISE À JOUR PRINCIPALE - Version stable
     */
    public update(): void {
        if (!this.isActive || this.gameState() !== GameState.PLAYING) {
            this.keySimulator.releaseAll();
            this.currentKey = 'NONE';
            return;
        }

        // Mise à jour de la position actuelle
        this.currentPosition = this.player1.position.z;
        
        // Calculer la vélocité actuelle de la balle
        this.updateBallVelocity();
        
        // Vérifier si on a besoin d'un snapshot
        this.checkSnapshotNeed();
        
        // Calculer la position cible stabilisée
        this.calculateStabilizedTargetPosition();
        
        // Mouvement stable
        this.executeStableMovement();
    }

    /**
     * Calcul de la vélocité de la balle
     */
    private updateBallVelocity(): void {
        const currentBallPos = this.ball.position;
        const deltaPos = currentBallPos.subtract(this.previousBallPosition);
        
        // Stocker la vélocité estimée
        this.lastBallVelocity = deltaPos.scale(60); // Approximation pour 60 FPS
        
        // Déterminer si la balle se dirige vers l'IA
        this.ballMovingTowardsAI = this.lastBallVelocity.x > 0 && currentBallPos.x < this.player1.position.x;
        
        // Mettre à jour la position précédente
        this.previousBallPosition = currentBallPos.clone();
    }

    /**
     * Vérification des snapshots
     */
    private checkSnapshotNeed(): void {
        const currentTime = performance.now();
        
        // Cooldown de snapshot respecté ?
        if (currentTime - this.lastSnapshotTime < this.snapshotCooldown) {
            return;
        }
        
        // Conditions pour déclencher un snapshot
        const shouldSnapshot = 
            // Premier snapshot si la balle vient vers l'IA
            (this.ballSnapshot === null && this.ballMovingTowardsAI) ||
            // Changement de direction vers l'IA (rebond sur joueur 0)
            this.detectSignificantDirectionChange() ||
            // La balle a rebondi sur un mur et change de trajectoire
            this.detectWallBounce();
            
        if (shouldSnapshot) {
            this.createSnapshot();
        }
    }
    
    /**
     * Détection des changements de direction significatifs
     */
    private detectSignificantDirectionChange(): boolean {
        if (!this.ballSnapshot) return false;
        
        const currentVel = this.lastBallVelocity;
        const snapshotVel = this.ballSnapshot.velocity;
        
        // Vérifier si la direction X a changé significativement
        const directionChanged = (snapshotVel.x <= 0 && currentVel.x > 0) || 
                                (Math.abs(currentVel.x - snapshotVel.x) > 200);
                                
        // Et que la balle se dirige maintenant vers l'IA
        return directionChanged && this.ballMovingTowardsAI;
    }
    
    /**
     * Détection des rebonds sur les murs
     */
    private detectWallBounce(): boolean {
        if (!this.ballSnapshot) return false;
        
        const currentVel = this.lastBallVelocity;
        const snapshotVel = this.ballSnapshot.velocity;
        
        // Vérifier si la vélocité Z a changé de signe (rebond sur mur)
        const zDirectionChanged = (snapshotVel.z > 0 && currentVel.z < 0) || 
                                 (snapshotVel.z < 0 && currentVel.z > 0);
                                 
        // Et que la balle se dirige vers l'IA
        return zDirectionChanged && this.ballMovingTowardsAI && Math.abs(currentVel.z) > 50;
    }
    
    /**
     * Création d'un snapshot
     */
    private createSnapshot(): void {
        this.ballSnapshot = {
            position: this.ball.position.clone(),
            velocity: this.lastBallVelocity.clone(),
            timestamp: performance.now()
        };
        
        this.lastSnapshotTime = this.ballSnapshot.timestamp;
        
        // Calculer immédiatement la prédiction d'impact
        this.predictImpactPosition();
        
        console.log(`🎯 Snapshot IA créé - Pos: (${this.ballSnapshot.position.x.toFixed(1)}, ${this.ballSnapshot.position.z.toFixed(1)}) - Vel: (${this.ballSnapshot.velocity.x.toFixed(1)}, ${this.ballSnapshot.velocity.z.toFixed(1)})`);
    }
    
    /**
     * Prédiction de la position d'impact
     */
    private predictImpactPosition(): void {
        if (!this.ballSnapshot || !this.ballMovingTowardsAI) {
            this.predictedImpactZ = null;
            return;
        }
        
        const snapshot = this.ballSnapshot;
        const aiX = this.player1.position.x;
        const ballPos = snapshot.position;
        const ballVel = snapshot.velocity;
        
        // Vérifier que la balle a une vélocité X positive
        if (ballVel.x <= 0) {
            this.predictedImpactZ = null;
            return;
        }
        
        // Calculer le temps pour atteindre la raquette IA
        const timeToReach = (aiX - ballPos.x) / ballVel.x;
        
        if (timeToReach <= 0) {
            this.predictedImpactZ = null;
            return;
        }
        
        // Position Z prédite avec simulation des rebonds multiples
        let predictedZ = ballPos.z + (ballVel.z * timeToReach);
        let currentVelZ = ballVel.z;
        
        // Limites des murs avec marge de sécurité
        const topWallZ = WALL_CONFIG.TOP_POSITION_Z - BALL_CONFIG.DIAMETER/2 - 5;
        const bottomWallZ = WALL_CONFIG.BOTTOM_POSITION_Z + BALL_CONFIG.DIAMETER/2 + 5;
        
        // Simulation des rebonds multiples
        let remainingTime = timeToReach;
        let currentZ = ballPos.z;
        let bounceCount = 0;
        const maxBounces = 3;
        
        while (remainingTime > 0 && bounceCount < maxBounces) {
            // Calculer le temps jusqu'au prochain mur
            let timeToWall = Infinity;
            
            if (currentVelZ > 0) {
                // Se dirige vers le mur du haut
                timeToWall = (topWallZ - currentZ) / currentVelZ;
            } else if (currentVelZ < 0) {
                // Se dirige vers le mur du bas
                timeToWall = (bottomWallZ - currentZ) / currentVelZ;
            }
            
            if (timeToWall >= remainingTime) {
                // Pas de rebond avant d'atteindre la raquette
                predictedZ = currentZ + (currentVelZ * remainingTime);
                break;
            } else {
                // Rebond sur un mur
                currentZ += currentVelZ * timeToWall;
                currentVelZ = -currentVelZ; // Inverser la direction
                remainingTime -= timeToWall;
                bounceCount++;
                
                // Corriger la position si elle dépasse légèrement
                if (currentZ > topWallZ) currentZ = topWallZ;
                if (currentZ < bottomWallZ) currentZ = bottomWallZ;
            }
        }
        
        // Si on n'a pas terminé la simulation, utiliser la position actuelle
        if (remainingTime > 0) {
            predictedZ = currentZ + (currentVelZ * remainingTime);
        }
        
        // Ajouter l'erreur selon la difficulté
        if (this.difficulty !== AIDifficulty.EXTREME) {
            const error = (Math.random() * 2 - 1) * this.config.positionError;
            predictedZ += error;
        }
        
        // S'assurer que la prédiction reste dans les limites
        predictedZ = Math.max(bottomWallZ + 20, Math.min(topWallZ - 20, predictedZ));
        
        this.predictedImpactZ = predictedZ;
        console.log(`🎯 Impact prédit en Z: ${predictedZ.toFixed(1)} (rebonds: ${bounceCount})`);
    }
    
    /**
     * Calcul de la position cible STABILISÉE
     */
    private calculateStabilizedTargetPosition(): void {
        const currentTime = performance.now();
        let newTarget = 0;
        
        // Calculer la nouvelle cible théorique
        if (this.predictedImpactZ !== null && this.ballMovingTowardsAI) {
            // Utiliser la prédiction si elle est valide
            newTarget = this.predictedImpactZ;
        } else {
            // Fallback intelligent basé sur la position actuelle de la balle
            const ballZ = this.ball.position.z;
            const ballVel = this.lastBallVelocity;
            
            if (this.ballMovingTowardsAI && Math.abs(ballVel.z) > 10) {
                // Anticiper le mouvement de la balle
                const anticipationTime = Math.min(1.0, this.config.anticipationDistance / Math.abs(ballVel.x));
                newTarget = ballZ + (ballVel.z * anticipationTime);
            } else {
                // Position défensive intelligente - plus conservatrice
                newTarget = ballZ * 0.4; // Facteur conservateur
            }
        }
        
        // Appliquer le facteur de précision
        if (this.difficulty !== AIDifficulty.EXTREME) {
            const currentTarget = this.lastValidTarget;
            newTarget = currentTarget + (newTarget - currentTarget) * this.config.precisionFactor;
        }
        
        // Limiter aux bornes du terrain avec marge de sécurité
        const safetyMargin = PLAYER_CONFIG.DEPTH / 2 + 15;
        newTarget = Math.max(
            CONTROLS_CONFIG.MIN_Z + safetyMargin, 
            Math.min(CONTROLS_CONFIG.MAX_Z - safetyMargin, newTarget)
        );
        
        // STABILISATION DE LA CIBLE - plus permissive
        const targetChange = Math.abs(newTarget - this.lastValidTarget);
        const timeSinceLastChange = currentTime - this.targetStabilityTime;
        
        // Ne changer de cible que si le changement est significatif
        if (targetChange > 15 && timeSinceLastChange > this.targetStabilityThreshold) {
            this.lastValidTarget = newTarget;
            this.targetStabilityTime = currentTime;
        }
        
        this.stableTargetPosition = this.lastValidTarget;
    }
    
    /**
     * Mouvement STABLE avec protection minimale contre les oscillations
     */
    private executeStableMovement(): void {
        const currentTime = performance.now();
        
        // Respecter le délai de réaction selon la difficulté
        if (this.config.reactionDelay > 0) {
            if (currentTime - this.lastKeyChangeTime < this.config.reactionDelay) {
                return;
            }
        }
        
        // Éviter les changements de touches trop fréquents
        if (currentTime - this.lastKeyChangeTime < this.keyChangeDelay) {
            return;
        }
        
        const distance = this.stableTargetPosition - this.currentPosition;
        const absDistance = Math.abs(distance);
        
        // Seuil de précision adaptatif
        const threshold = Math.max(10, CONTROLS_CONFIG.SPEED * 0.6);
        
        // Si on est assez proche de la cible, arrêter
        if (absDistance <= threshold) {
            if (this.currentKey !== 'NONE') {
                this.keySimulator.releaseAll();
                this.currentKey = 'NONE';
                this.lastKeyChangeTime = currentTime;
                
                // Réinitialiser le système anti-oscillation
                this.isDirectionLocked = false;
                this.sameDirectionCount = 0;
                this.lastStableDirection = 'NONE';
            }
            return;
        }
        
        // Calculer la direction nécessaire
        const direction = distance > 0 ? 'UP' : 'DOWN';
        
        // Système de mouvement intelligent avec protection légère
        const urgency = Math.min(1, absDistance / 100);
        const shouldMove = urgency > 0.15 || absDistance > threshold * 2;
        
        // Protection contre les oscillations CORRIGÉE
        if (this.isDirectionLocked && currentTime - this.directionLockTime < 200) {
            // Direction verrouillée temporairement - LIBÉRER LES TOUCHES
            if (this.currentKey !== 'NONE') {
                this.keySimulator.releaseAll();
                this.currentKey = 'NONE';
            }
            return;
        } else if (this.isDirectionLocked) {
            // Déverrouiller après le délai
            this.isDirectionLocked = false;
            this.sameDirectionCount = 0;
            this.lastStableDirection = 'NONE'; // Reset complet
        }
        
        // Vérifier les changements de direction - LOGIQUE SIMPLIFIÉE
        if (direction !== this.lastStableDirection) {
            // Changement de direction détecté
            if (this.lastStableDirection !== 'NONE' && this.sameDirectionCount < 2) { // Réduit de 3 à 2
                // Si on a pas assez bougé dans la direction précédente, verrouiller
                this.isDirectionLocked = true;
                this.directionLockTime = currentTime;
                
                // IMPORTANT : Libérer immédiatement les touches
                this.keySimulator.releaseAll();
                this.currentKey = 'NONE';
                this.lastKeyChangeTime = currentTime;
                
                console.log(`🔒 Direction verrouillée temporairement pour éviter l'oscillation`);
                return;
            }
            
            // Changement accepté
            this.lastStableDirection = direction;
            this.sameDirectionCount = 1;
        } else {
            // Même direction, incrémenter le compteur
            this.sameDirectionCount++;
        }
        
        // Mouvement seulement si nécessaire et direction différente de la touche actuelle
        if (shouldMove && direction !== this.currentKey) {
            // Changer la direction
            this.keySimulator.releaseAll();
            
            if (direction === 'UP') {
                this.keySimulator.pressKey('UP');
            } else {
                this.keySimulator.pressKey('DOWN');
            }
            
            this.currentKey = direction;
            this.lastKeyChangeTime = currentTime;
            this.lastMovementTime = currentTime;
            
            console.log(`🎮 IA bouge ${direction} - Distance: ${distance.toFixed(1)} - Urgence: ${urgency.toFixed(2)}`);
        }
    }
    
    /**
     * Force un snapshot pour réagir aux nouvelles balles
     */
    public forceSnapshot(): void {
        // Réinitialiser le cooldown pour permettre un snapshot immédiat
        this.lastSnapshotTime = 0;
        this.ballSnapshot = null;
        this.predictedImpactZ = null;
        
        // Attendre un frame pour que la balle soit repositionnée
        setTimeout(() => {
            if (this.ballMovingTowardsAI || this.lastBallVelocity.x > 0) {
                this.createSnapshot();
            }
        }, 50);
        
        console.log("🎯 Snapshot IA forcé");
    }
    
    /**
     * Réinitialise l'IA
     */
    public reset(): void {
        this.currentKey = 'NONE';
        this.keySimulator.releaseAll();
        this.ballSnapshot = null;
        this.predictedImpactZ = null;
        this.lastSnapshotTime = 0;
        this.currentPosition = this.player1.position.z;
        this.targetPosition = this.currentPosition;
        this.stableTargetPosition = this.currentPosition;
        this.lastValidTarget = this.currentPosition;
        this.targetStabilityTime = 0;
        this.ballMovingTowardsAI = false;
        this.lastBallVelocity = new Vector3(0, 0, 0);
        this.previousBallPosition = this.ball.position.clone();
        
        // Réinitialiser l'anti-oscillation simplifiée
        this.lastStableDirection = 'NONE';
        this.sameDirectionCount = 0;
        this.directionLockTime = 0;
        this.isDirectionLocked = false;
        this.lastMovementTime = 0;
        
        console.log("🤖 IA STABLE réinitialisée");
    }

    public getDifficulty(): AIDifficulty {
        return this.difficulty;
    }

    public getDifficultyName(): string {
        const names = {
            [AIDifficulty.VERY_EASY]: "Très Facile",
            [AIDifficulty.EASY]: "Facile", 
            [AIDifficulty.MEDIUM]: "Moyen",
            [AIDifficulty.HARD]: "Difficile",
            [AIDifficulty.EXTREME]: "Extrême"
        };
        return names[this.difficulty];
    }

    public isAIActive(): boolean {
        return this.isActive;
    }

    public setDifficulty(difficulty: AIDifficulty): void {
        this.difficulty = difficulty;
        this.config = AI_CONFIGS[difficulty];
        console.log(`🤖 IA configurée - ${this.getDifficultyName()}`);
    }

    public activate(): void {
        this.isActive = true;
        this.reset();
        console.log(`🤖 IA STABLE activée`);
    }

    public deactivate(): void {
        this.isActive = false;
        this.keySimulator.releaseAll();
        this.reset();
        console.log(`🤖 IA désactivée`);
    }
}

/**
 * Simulateur d'entrées clavier
 */
export class KeyboardSimulator {
    private activeKeys: Set<string> = new Set();

    constructor(private keyEventTarget: EventTarget = window) {}

    public pressKey(key: string, intensity = 1.0): void {
        const keyCode = this.getKeyCode(key);
        if (!keyCode) return;

        this.activeKeys.add(key);

        const event = new KeyboardEvent('keydown', {
            key: keyCode,
            code: keyCode,
            bubbles: true
        });

        this.keyEventTarget.dispatchEvent(event);
    }

    public releaseKey(key: string): void {
        const keyCode = this.getKeyCode(key);
        if (!keyCode) return;

        this.activeKeys.delete(key);

        const event = new KeyboardEvent('keyup', {
            key: keyCode,
            code: keyCode,
            bubbles: true
        });

        this.keyEventTarget.dispatchEvent(event);
    }

    public releaseAll(): void {
        const keysToRelease = Array.from(this.activeKeys);
        keysToRelease.forEach(key => this.releaseKey(key));
    }

    private getKeyCode(command: string): string | null {
        if (command === 'UP') {
            const upKeys = CONTROLS_CONFIG.KEYS.PLAYER1.UP;
            if (upKeys && upKeys.length > 0) {
                return upKeys[0];
            }
        } else if (command === 'DOWN') {
            const downKeys = CONTROLS_CONFIG.KEYS.PLAYER1.DOWN;
            if (downKeys && downKeys.length > 0) {
                return downKeys[0];
            }
        }
        
        return null;
    }

    public isKeyPressed(key: string): boolean {
        return this.activeKeys.has(key);
    }
}