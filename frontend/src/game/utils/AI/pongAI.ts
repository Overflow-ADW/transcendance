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
    
    // === SYSTÈME DE SNAPSHOT SIMPLIFIÉ ===
    private lastSnapshot: {
        position: Vector3;
        velocity: Vector3;
        timestamp: number;
        reason: string;
        interceptPoint: number;
    } | null = null;
    private lastSnapshotTime = 0;
    private readonly SNAPSHOT_INTERVAL = 1000; // 1 seconde stricte
    
    // === DÉTECTION ROBUSTE DE CHANGEMENT DE DIRECTION ===
    private lastBallPosition: Vector3 | null = null;
    private lastBallTimestamp = 0;
    private lastBallVelocityX = 0; // PROPRIÉTÉ MANQUANTE CRITIQUE
    private ballTowardsAI = false;
    
    // === PRÉDICTION ET MOUVEMENT ===
    private targetPosition = 0;
    private currentMode: 'DEFENSIVE' | 'INTERCEPTION' = 'DEFENSIVE';
    
    // === CONTRÔLES SIMPLES ===
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
        console.log(`🤖 IA Intelligente créée - Difficulté: ${getDifficultyName(this.difficulty)}`);
    }

    /**
     * GESTION DE LA DIFFICULTÉ
     */
    public setDifficulty(difficulty: AIDifficulty): void {
        this.difficulty = difficulty;
        this.config = AI_CONFIGS[difficulty];
        console.log(`🎯 Difficulté IA: ${getDifficultyName(this.difficulty)}`);
    }

    public getDifficulty(): AIDifficulty {
        return this.difficulty;
    }

    public getDifficultyName(): string {
        return getDifficultyName(this.difficulty);
    }

    /**
     * ACTIVATION/DÉSACTIVATION
     */
    public activate(): void {
        this.isActive = true;
        this.reset();
        console.log(`🤖 IA activée`);
    }

    public deactivate(): void {
        this.isActive = false;
        this.stopMovement();
        console.log(`🤖 IA désactivée`);
    }

    public isAIActive(): boolean {
        return this.isActive;
    }

    /**
     * MISE À JOUR PRINCIPALE - SYSTÈME SIMPLIFIÉ
     */
    public update(): void {
        if (!this.isActive || this.gameState() !== GameState.PLAYING) {
            this.stopMovement();
            return;
        }

        // 1. DÉTECTION AUTOMATIQUE DU CHANGEMENT DE DIRECTION
        this.detectDirectionChange();
        
        // 2. ANALYSER ET DÉCIDER
        this.analyzeAndDecide();
        
        // 3. EXÉCUTER LES MOUVEMENTS
        this.executeMovement();
    }

    /**
     * DÉTECTION AUTOMATIQUE DU CHANGEMENT DE DIRECTION
     * La méthode la plus importante - détecte quand la balle change de direction vers l'IA
     */
    private detectDirectionChange(): void {
        const ballPos = this.ball.position.clone();
        const currentVelX = this.calculateCurrentVelocityX(ballPos);
        
        // DEBUG : Afficher la position de la balle en continu quand elle bouge
        if (Math.abs(currentVelX) > 10) {
            console.log(`🔍 Balle: X=${ballPos.x.toFixed(1)}, VelX=${currentVelX.toFixed(1)}, TowardsAI=${this.ballTowardsAI}`);
        }
        
        // CORRECTION CRITIQUE : Ignorer si la balle est hors limites (but marqué)
        if (Math.abs(ballPos.x) > BALL_CONFIG.OUT_OF_BOUNDS_X) {
            console.log(`🚫 Balle hors limites: X=${ballPos.x.toFixed(1)} (limite: ±${BALL_CONFIG.OUT_OF_BOUNDS_X}) - Ignorer détection`);
            this.ballTowardsAI = false;
            return;
        }
        
        // ⚡ CORRECTION MAJEURE : Vérifier IMMÉDIATEMENT si on peut créer un snapshot
        if (!this.canCreateSnapshot()) {
            // Mettre à jour SEULEMENT les variables de tracking sans créer de snapshot
            this.lastBallPosition = ballPos.clone();
            this.lastBallVelocityX = currentVelX;
            this.lastBallTimestamp = performance.now();
            return;
        }
        
        // CORRECTION : Utiliser les vraies valeurs du jeu - zones plus strictes
        const leftZoneLimit = -200;   // Zone gauche étendue  
        const rightZoneLimit = 200;   // Zone droite étendue
        
        // Zones corrigées avec les vraies valeurs
        const isInLeftZone = ballPos.x < leftZoneLimit;           // Zone du joueur 0 (< -200)
        const isInMiddleZone = ballPos.x >= leftZoneLimit && ballPos.x <= rightZoneLimit;  // Zone centrale (-200 à 200)
        const isInRightZone = ballPos.x > rightZoneLimit;         // Zone de l'IA (> 200)
        
        // Détecter les transitions de zones critiques
        const wasInLeftZone = this.lastBallPosition ? this.lastBallPosition.x < leftZoneLimit : false;
        const wasInMiddleZone = this.lastBallPosition ? 
            (this.lastBallPosition.x >= leftZoneLimit && this.lastBallPosition.x <= rightZoneLimit) : false;
        
        // Transition zone gauche → zone centrale (balle part de Player 0)
        if (wasInLeftZone && isInMiddleZone && currentVelX > 0) {
            console.log(`⚡ TRANSITION ZONE GAUCHE → CENTRALE ! Pos: ${ballPos.x.toFixed(1)}`);
            if (!this.ballTowardsAI) {
                const fullVelocity = this.estimateFullVelocity(ballPos);
                // S'assurer que la vélocité X est positive et réaliste
                if (fullVelocity.x <= 0) {
                    fullVelocity.x = Math.max(250, Math.abs(currentVelX));
                }
                console.log(`   Vélocité complète utilisée: X=${fullVelocity.x.toFixed(1)}, Z=${fullVelocity.z.toFixed(1)}`);
                this.createSnapshot(ballPos, fullVelocity, "ZONE_LEFT_TO_MIDDLE");
                this.ballTowardsAI = true;
                this.lastBallVelocityX = fullVelocity.x;
                return;
            }
            
            // Si la balle était dans la zone centrale et entre dans la zone droite
            if (wasInMiddleZone && isInRightZone && currentVelX > 0) {
                console.log(`⚡ TRANSITION ZONE CENTRALE → DROITE ! Pos: ${ballPos.x.toFixed(1)}`);
                if (!this.ballTowardsAI) {
                    const fullVelocity = this.estimateFullVelocity(ballPos);
                    if (fullVelocity.x <= 0) {
                        fullVelocity.x = Math.max(250, Math.abs(currentVelX));
                    }
                    console.log(`   Vélocité complète utilisée: X=${fullVelocity.x.toFixed(1)}, Z=${fullVelocity.z.toFixed(1)}`);
                    this.createSnapshot(ballPos, fullVelocity, "ZONE_MIDDLE_TO_RIGHT");
                    this.ballTowardsAI = true;
                    this.lastBallVelocityX = fullVelocity.x;
                    return;
                }
            }
        }
        
        // CORRECTION MAJEURE : Détection spéciale quand la balle est proche du joueur 0
        const isNearPlayer0 = Math.abs(ballPos.x - PLAYER_CONFIG.PLAYER0_POSITION_X) < 60;
        
        if (isNearPlayer0 && currentVelX > 50) {
            console.log(`🔄 REBOND PLAYER 0 DÉTECTÉ ! VelX: ${currentVelX.toFixed(1)}`);
            
            const fullVelocity = this.estimateFullVelocity(ballPos);
            if (fullVelocity.x <= 0) {
                fullVelocity.x = Math.max(200, currentVelX);
            }
            console.log(`   Vélocité rebond utilisée: X=${fullVelocity.x.toFixed(1)}, Z=${fullVelocity.z.toFixed(1)}`);
            this.createSnapshot(ballPos, fullVelocity, "PLAYER0_BOUNCE");
            this.ballTowardsAI = true;
            this.lastBallVelocityX = currentVelX;
            return;
        }
        
        // BACKUP 2 : Détection par changement de vélocité (seulement si pas déjà vers l'IA)
        const wasGoingAwayOrStopped = this.lastBallVelocityX <= 50;
        const nowGoingTowardsAI = currentVelX > 50;
        
        if (wasGoingAwayOrStopped && nowGoingTowardsAI && !this.ballTowardsAI) {
            console.log(`🔄 CHANGEMENT DE DIRECTION DÉTECTÉ ! Ancienne: ${this.lastBallVelocityX.toFixed(1)} → Nouvelle: ${currentVelX.toFixed(1)}`);
            const fullVelocity = this.estimateFullVelocity(ballPos);
            if (fullVelocity.x <= 0) {
                fullVelocity.x = Math.max(200, currentVelX);
            }
            this.createSnapshot(ballPos, fullVelocity, "VELOCITY_CHANGE");
            this.ballTowardsAI = true;
        }
        
        // Mise à jour des variables de tracking
        this.lastBallPosition = ballPos.clone();
        this.lastBallVelocityX = currentVelX;
        this.lastBallTimestamp = performance.now();
    }

    /**
     * CALCUL SIMPLIFIÉ DE LA VÉLOCITÉ X ACTUELLE
     */
    private calculateCurrentVelocityX(currentPos: Vector3): number {
        if (!this.lastBallPosition || !this.lastBallTimestamp) {
            this.lastBallPosition = currentPos.clone();
            this.lastBallTimestamp = performance.now();
            return 0;
        }
        
        const deltaTime = (performance.now() - this.lastBallTimestamp) / 1000;
        
        if (deltaTime > 0.01) { // Au moins 10ms
            const deltaX = currentPos.x - this.lastBallPosition.x;
            const velocityX = deltaX / deltaTime;
            
            // NE PAS mettre à jour ici - on le fait dans estimateFullVelocity
            return velocityX;
        }
        
        return this.lastBallVelocityX;
    }

    /**
     * ESTIMATION DE LA VÉLOCITÉ COMPLÈTE - CORRIGÉE
     */
    private estimateFullVelocity(currentPos: Vector3): Vector3 {
        if (!this.lastBallPosition || !this.lastBallTimestamp) {
            this.lastBallPosition = currentPos.clone();
            this.lastBallTimestamp = performance.now();
            return new Vector3(0, 0, 0);
        }
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastBallTimestamp) / 1000;
        
        if (deltaTime > 0.01) { // Au moins 10ms
            const deltaPos = currentPos.subtract(this.lastBallPosition);
            const velocity = deltaPos.scale(1 / deltaTime);
            
            // Mettre à jour la position précédente ICI
            this.lastBallPosition = currentPos.clone();
            this.lastBallTimestamp = currentTime;
            
            console.log(`🔍 VÉLOCITÉ CALCULÉE: X=${velocity.x.toFixed(1)}, Z=${velocity.z.toFixed(1)}`);
            return velocity;
        }
        
        // Fallback avec dernières valeurs connues
        if (this.lastSnapshot) {
            return this.lastSnapshot.velocity.clone();
        }
        
        return new Vector3(this.lastBallVelocityX, 0, 0);
    }

    /**
     * CRÉATION D'UN SNAPSHOT SIMPLIFIÉ
     */
    private createSnapshot(position: Vector3, velocity: Vector3, reason: string): void {
        const timestamp = performance.now();
        
        // Calculer le point d'interception avec précision 100%
        const interceptPoint = this.calculatePerfectTrajectory(position, velocity);
        
        this.lastSnapshot = {
            position: position.clone(),
            velocity: velocity.clone(),
            timestamp: timestamp,
            reason: reason,
            interceptPoint: interceptPoint
        };
        
        this.lastSnapshotTime = timestamp;
        
        console.log(`📸 SNAPSHOT: ${reason}`);
        console.log(`   Position: (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
        console.log(`   Vélocité: (${velocity.x.toFixed(1)}, ${velocity.z.toFixed(1)})`);
        console.log(`   Point d'interception: ${interceptPoint.toFixed(1)}`);
    }

    /**
     * CALCUL DE TRAJECTOIRE PARFAIT (100% PRÉCISION POUR LES TESTS)
     */
    private calculatePerfectTrajectory(ballPos: Vector3, ballVel: Vector3): number {
        // Si la balle ne vient pas vers l'IA, position défensive
        if (ballVel.x <= 0) {
            console.log(`   ❌ Trajectoire: Balle ne vient pas vers l'IA (VelX: ${ballVel.x.toFixed(1)})`);
            return 0;
        }
        
        const aiX = PLAYER_CONFIG.PLAYER1_POSITION_X; // 490
        
        // CORRECTION: Utiliser les vraies positions des murs de collision
        // Les murs sont à TOP_POSITION_Z (300) et BOTTOM_POSITION_Z (-300)
        // Mais la balle rebondit quand elle TOUCHE le mur, pas quand elle l'atteint
        // Donc il faut tenir compte du rayon de la balle
        const ballRadius = BALL_CONFIG.DIAMETER / 2; // 10
        const wallTop = WALL_CONFIG.TOP_POSITION_Z - ballRadius; // 300 - 10 = 290
        const wallBottom = WALL_CONFIG.BOTTOM_POSITION_Z + ballRadius; // -300 + 10 = -290
        
        // Temps pour atteindre l'IA
        const timeToReach = (aiX - ballPos.x) / ballVel.x;
        
        if (timeToReach <= 0) {
            console.log(`   ❌ Trajectoire: Temps négatif (${timeToReach.toFixed(3)}s)`);
            return 0;
        }
        
        console.log(`   ⏱️ Temps pour atteindre l'IA: ${timeToReach.toFixed(3)}s`);
        console.log(`   📍 Position initiale: Z=${ballPos.z.toFixed(1)}, VelZ=${ballVel.z.toFixed(1)}`);
        console.log(`   🧱 Murs effectifs: Top=${wallTop}, Bottom=${wallBottom}`);
        
        // Simulation parfaite de la trajectoire Z avec rebonds
        let currentZ = ballPos.z;
        let currentVelZ = ballVel.z;
        let timeRemaining = timeToReach;
        let bounceCount = 0;
        
        // Simuler jusqu'à 20 rebonds si nécessaire
        for (let i = 0; i < 20 && timeRemaining > 0; i++) {
            if (Math.abs(currentVelZ) < 0.1) {
                console.log(`   🚫 Arrêt simulation: Pas de mouvement vertical (VelZ: ${currentVelZ.toFixed(3)})`);
                break; // Pas de mouvement vertical
            }
            
            let timeToWall: number;
            let wallZ: number;
            
            if (currentVelZ > 0) {
                // Balle va vers le haut
                timeToWall = (wallTop - currentZ) / currentVelZ;
                wallZ = wallTop;
            } else {
                // Balle va vers le bas
                timeToWall = (wallBottom - currentZ) / currentVelZ;
                wallZ = wallBottom;
            }
            
            console.log(`   🔄 Simulation rebond ${i+1}: temps=${timeToWall.toFixed(3)}s, mur=${wallZ}, restant=${timeRemaining.toFixed(3)}s`);
            
            if (timeToWall >= timeRemaining) {
                // Atteint l'IA avant le rebond
                currentZ += currentVelZ * timeRemaining;
                console.log(`   ✅ Position finale sans rebond: Z=${currentZ.toFixed(1)}`);
                break;
            } else {
                // Rebond
                currentZ = wallZ;
                currentVelZ = -currentVelZ; // Inversion parfaite
                timeRemaining -= timeToWall;
                bounceCount++;
                console.log(`   🏓 Rebond ${bounceCount}: nouvelle VelZ=${currentVelZ.toFixed(1)}, temps restant=${timeRemaining.toFixed(3)}s`);
            }
        }
        
        console.log(`   🎯 Position finale calculée: Z=${currentZ.toFixed(1)} (après ${bounceCount} rebonds)`);
        
        // Limiter aux zones jouables pour l'IA (pas d'erreur pour les tests)
        const finalPosition = Math.max(CONTROLS_CONFIG.MIN_Z, Math.min(CONTROLS_CONFIG.MAX_Z, currentZ));
        
        if (finalPosition !== currentZ) {
            console.log(`   ⚠️ Position ajustée aux limites de jeu: ${finalPosition.toFixed(1)} (limite: [${CONTROLS_CONFIG.MIN_Z}, ${CONTROLS_CONFIG.MAX_Z}])`);
        }
        
        return finalPosition;
    }

    /**
     * VÉRIFICATION DE LA POSSIBILITÉ DE CRÉER UN SNAPSHOT
     */
    private canCreateSnapshot(): boolean {
        const timeSinceLastSnapshot = performance.now() - this.lastSnapshotTime;
        const canCreate = timeSinceLastSnapshot >= this.SNAPSHOT_INTERVAL;
        
        if (!canCreate) {
            const remainingTime = this.SNAPSHOT_INTERVAL - timeSinceLastSnapshot;
            console.log(`⏳ Snapshot bloqué - attendre ${remainingTime.toFixed(0)}ms`);
        }
        
        return canCreate;
    }

    /**
     * ANALYSE ET DÉCISION BASÉE SUR LE SNAPSHOT
     */
    private analyzeAndDecide(): void {
        if (!this.lastSnapshot) {
            // Pas de snapshot - position défensive
            this.currentMode = 'DEFENSIVE';
            this.targetPosition = 0;
            return;
        }

        // Vérifier si le snapshot est encore valide (balle vient toujours vers nous)
        if (this.ballTowardsAI) {
            this.currentMode = 'INTERCEPTION';
            this.targetPosition = this.lastSnapshot.interceptPoint;
        } else {
            this.currentMode = 'DEFENSIVE';
            this.targetPosition = 0;
        }
    }

    /**
     * EXÉCUTION DES MOUVEMENTS - SIMPLE ET STABLE
     */
    private executeMovement(): void {
        const currentPosition = this.player1.position.z;
        const distance = this.targetPosition - currentPosition;
        const currentTime = performance.now();

        // Seuil de tolérance pour éviter le jiggle - AUGMENTÉ pour plus de stabilité
        const tolerance = 15.0; // Augmenté de 5.0 à 15.0
        
        if (Math.abs(distance) < tolerance) {
            // On est assez proche, arrêter le mouvement
            this.stopMovement();
            return;
        }

        // Déterminer la direction
        const direction = distance > 0 ? 'UP' : 'DOWN';

        // Éviter les changements de direction trop fréquents (anti-jiggle)
        const minKeyChangeInterval = 150; // Augmenté de 100ms à 150ms pour plus de stabilité
        
        // NOUVEAU: Éviter les changements de direction contradictoires
        // Si on était en train d'aller dans une direction et que la cible change légèrement,
        // continuer dans la même direction jusqu'à être vraiment proche
        const isChangingDirection = (this.currentKey === 'UP' && direction === 'DOWN') || 
                                   (this.currentKey === 'DOWN' && direction === 'UP');
        
        if (isChangingDirection && Math.abs(distance) > 50) {
            // Si on change de direction et qu'on est encore loin, continuer dans la direction actuelle
            // un peu plus longtemps pour éviter les oscillations
            console.log(`🔄 Éviter changement de direction: distance=${Math.abs(distance).toFixed(1)}, continuer ${this.currentKey}`);
            return;
        }
        
        if (this.currentKey !== direction && (currentTime - this.lastKeyChangeTime) > minKeyChangeInterval) {
            this.keySimulator.releaseAll();
            
            const key = direction === 'UP' ? 'UP' : 'DOWN';
            this.keySimulator.pressKey(key);
            
            this.currentKey = direction;
            this.lastKeyChangeTime = currentTime;
            
            console.log(`🎮 ${this.currentMode} ${direction} - Distance: ${Math.abs(distance).toFixed(1)}, Cible: ${this.targetPosition.toFixed(1)}`);
        }
    }

    /**
     * ARRÊT DU MOUVEMENT
     */
    private stopMovement(): void {
        if (this.currentKey !== 'NONE') {
            this.keySimulator.releaseAll();
            this.currentKey = 'NONE';
        }
    }

    /**
     * RÉINITIALISATION
     */
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
        console.log(`🤖 IA réinitialisée`);
    }

    /**
     * SNAPSHOT FORCÉ (pour les débuts de partie)
     */
    public forceSnapshot(): void {
        const ballPos = this.ball.position.clone();
        const ballVel = this.estimateFullVelocity(ballPos);
        
        if (ballVel.x > 0) { // Seulement si la balle vient vers l'IA
            this.createSnapshot(ballPos, ballVel, "FORCE_START");
            this.ballTowardsAI = true;
            console.log("🔄 Snapshot forcé - Début de partie");
        }
    }

    /**
     * NOUVELLE MÉTHODE : Détection directe des collisions avec Player 0
     * Cette méthode sera appelée par le système de collision du jeu
     */
    public notifyPlayer0Hit(ballPosition: Vector3, ballVelocity: Vector3): void {
        console.log(`🏓 NOTIFICATION DIRECTE: Player 0 a touché la balle !`);
        console.log(`   Position: (${ballPosition.x.toFixed(1)}, ${ballPosition.z.toFixed(1)})`);
        console.log(`   Vélocité: (${ballVelocity.x.toFixed(1)}, ${ballVelocity.z.toFixed(1)})`);
        
        // Vérifier que la balle vient bien vers l'IA
        if (ballVelocity.x > 0 && this.canCreateSnapshot()) {
            this.createSnapshot(ballPosition, ballVelocity, "PLAYER0_HIT_DIRECT");
            this.ballTowardsAI = true;
            this.lastBallVelocityX = ballVelocity.x;
            console.log(`✅ Snapshot créé suite à collision Player 0`);
        }
    }

    /**
     * NOUVELLE MÉTHODE : Détection directe du début de partie
     */
    public notifyGameStart(ballPosition: Vector3, ballVelocity: Vector3): void {
        console.log(`🚀 NOTIFICATION DIRECTE: Début de partie !`);
        console.log(`   Position: (${ballPosition.x.toFixed(1)}, ${ballPosition.z.toFixed(1)})`);
        console.log(`   Vélocité: (${ballVelocity.x.toFixed(1)}, ${ballVelocity.z.toFixed(1)})`);
        
        // Créer immédiatement un snapshot pour le début de partie
        if (ballVelocity.x > 0) {
            this.createSnapshot(ballPosition, ballVelocity, "GAME_START_DIRECT");
            this.ballTowardsAI = true;
            this.lastBallVelocityX = ballVelocity.x;
            console.log(`✅ Snapshot créé pour début de partie`);
        }
    }

    public getDebugInfo(): string {
        if (!this.isActive) {
            return "IA inactive";
        }
        
        const timeSinceSnapshot = performance.now() - this.lastSnapshotTime;
        const nextSnapshotIn = Math.max(0, this.SNAPSHOT_INTERVAL - timeSinceSnapshot);
        const snapshotAge = this.lastSnapshot ? performance.now() - this.lastSnapshot.timestamp : 0;
        
        return [
            `Mode: ${this.currentMode}`,
            `Snapshot: ${this.lastSnapshot ? this.lastSnapshot.reason : 'AUCUN'}`,
            `Âge: ${snapshotAge.toFixed(0)}ms`,
            `Cible: ${this.targetPosition.toFixed(1)}`,
            `Pos: ${this.player1.position.z.toFixed(1)}`,
            `Prochain: ${nextSnapshotIn.toFixed(0)}ms`
        ].join(' | ');
    }
}