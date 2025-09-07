import { Vector3, Mesh } from "@babylonjs/core";
import { BallSnapshot, PendingSnapshot, AIDifficulty } from "./aiTypes";
import { BALL_CONFIG } from "@/game/utils/pongValues";

export class SnapshotSystem {
    private ballSnapshot: BallSnapshot | null = null;
    private lastSnapshotTime = 0;
    private readonly MIN_SNAPSHOT_INTERVAL = 1000; // 1 seconde ABSOLUE
    private pendingSnapshots: PendingSnapshot[] = [];
    
    // Compteurs de debug
    private snapshotAttempts = 0;
    private snapshotBlocked = 0;
    private snapshotSuccessful = 0;
    private ballAccessAttempts = 0;
    private ballAccessBlocked = 0;

    constructor(private ball: Mesh, private difficulty: AIDifficulty) {}

    /**
     * VÉRIFICATION ULTRA-STRICTE - AUCUNE EXCEPTION
     */
    private canCreateSnapshot(): boolean {
        const currentTime = performance.now();
        const timeSinceLastSnapshot = currentTime - this.lastSnapshotTime;
        
        // DÉLAI ABSOLU - AUCUNE TOLÉRANCE
        if (timeSinceLastSnapshot < this.MIN_SNAPSHOT_INTERVAL) {
            this.snapshotBlocked++;
            return false;
        }
        
        return true;
    }

    /**
     * SEUL ACCÈS AUTORISÉ À LA BALLE - CRÉATION DE SNAPSHOT UNIQUEMENT
     */
    private createAuthorizedSnapshot(reason: string): Vector3 | null {
        this.ballAccessAttempts++;
        
        if (!this.canCreateSnapshot()) {
            this.ballAccessBlocked++;
            console.log(`🚫 ACCÈS BLOQUÉ: ${reason} - Délai insuffisant (${this.ballAccessBlocked}/${this.ballAccessAttempts})`);
            return null;
        }
        
        // SEUL ET UNIQUE ACCÈS AUTORISÉ
        const authorizedPosition = this.ball.position.clone();
        console.log(`✅ ACCÈS AUTORISÉ: ${reason} - Position capturée: (${authorizedPosition.x.toFixed(1)}, ${authorizedPosition.z.toFixed(1)})`);
        
        return authorizedPosition;
    }

    /**
     * QUEUE SNAPSHOT AVEC POSITION PRÉ-CAPTURÉE
     */
    public queueSnapshotWithPosition(reason: string, priority: number, timestamp: number, preAuthorizedPosition: Vector3, velocity: Vector3): void {
        this.snapshotAttempts++;
        
        // Éviter les doublons
        const recentSimilar = this.pendingSnapshots.find(s => 
            s.reason === reason && 
            Math.abs(timestamp - s.timestamp) < 500
        );
        
        if (recentSimilar) {
            console.log(`⚠️ Snapshot ${reason} ignoré - doublon récent`);
            return;
        }
        
        const snapshot: PendingSnapshot = {
            reason: reason,
            timestamp: timestamp,
            ballPosition: preAuthorizedPosition,
            ballVelocity: velocity,
            priority: priority
        };
        
        this.pendingSnapshots.push(snapshot);
        this.pendingSnapshots.sort((a, b) => a.priority - b.priority);
        
        console.log(`📥 Snapshot ${reason} en file (priorité ${priority}) - Position pré-autorisée utilisée`);
    }

    /**
     * QUEUE SNAPSHOT STANDARD
     */
    public queueSnapshot(reason: string, priority: number, timestamp: number, velocity: Vector3): void {
        this.snapshotAttempts++;
        
        // Vérifier si on peut créer un snapshot
        if (!this.canCreateSnapshot()) {
            return;
        }
        
        // Éviter les doublons
        const recentSimilar = this.pendingSnapshots.find(s => 
            s.reason === reason && 
            Math.abs(timestamp - s.timestamp) < 500
        );
        
        if (recentSimilar) {
            console.log(`⚠️ Snapshot ${reason} ignoré - doublon récent`);
            return;
        }
        
        // Capturer la position de la balle maintenant (seul accès autorisé)
        const currentBallPosition = this.ball.position.clone();
        
        const snapshot: PendingSnapshot = {
            reason: reason,
            timestamp: timestamp,
            ballPosition: currentBallPosition,
            ballVelocity: velocity,
            priority: priority
        };
        
        this.pendingSnapshots.push(snapshot);
        this.pendingSnapshots.sort((a, b) => a.priority - b.priority);
        
        console.log(`📥 Snapshot ${reason} en file (priorité ${priority}). File: ${this.pendingSnapshots.length}`);
    }

    /**
     * TRAITER LA FILE D'ATTENTE
     */
    public processSnapshotQueue(): void {
        if (this.pendingSnapshots.length === 0) {
            return;
        }
        
        // VÉRIFICATION STRICTE AVANT TRAITEMENT
        if (!this.canCreateSnapshot()) {
            return;
        }
        
        // Prendre le snapshot de plus haute priorité
        const nextSnapshot = this.pendingSnapshots.shift();
        if (nextSnapshot) {
            const currentTime = performance.now();
            const actualDelay = currentTime - this.lastSnapshotTime;
            
            console.log(`🎯 TRAITEMENT STRICT: ${nextSnapshot.reason} après ${actualDelay.toFixed(0)}ms (≥${this.MIN_SNAPSHOT_INTERVAL}ms)`);
            this.createSnapshotFromQueue(nextSnapshot);
        }
    }

    /**
     * CRÉER UN SNAPSHOT - VÉRIFICATION FINALE TRIPLE
     */
    private createSnapshotFromQueue(queuedSnapshot: PendingSnapshot): boolean {
        const currentTime = performance.now();
        
        // VÉRIFICATION FINALE ULTRA-STRICTE
        const timeSinceLastSnapshot = currentTime - this.lastSnapshotTime;
        if (timeSinceLastSnapshot < this.MIN_SNAPSHOT_INTERVAL) {
            console.error(`🚨 ERREUR CRITIQUE: Snapshot avec délai ${timeSinceLastSnapshot.toFixed(0)}ms < ${this.MIN_SNAPSHOT_INTERVAL}ms`);
            
            // Remettre en file d'attente
            this.pendingSnapshots.unshift(queuedSnapshot);
            this.pendingSnapshots.sort((a, b) => a.priority - b.priority);
            return false;
        }
        
        // CRÉATION AUTORISÉE
        this.ballSnapshot = {
            position: queuedSnapshot.ballPosition,
            velocity: queuedSnapshot.ballVelocity,
            timestamp: queuedSnapshot.timestamp,
            reason: queuedSnapshot.reason
        };

        // MISE À JOUR DU TIMESTAMP
        this.lastSnapshotTime = currentTime;
        this.snapshotSuccessful++;
        
        console.log(`📸 SNAPSHOT STRICT créé (${queuedSnapshot.reason})`);
        console.log(`   Position: (${this.ballSnapshot.position.x.toFixed(1)}, ${this.ballSnapshot.position.z.toFixed(1)})`);
        console.log(`   Vélocité: (${this.ballSnapshot.velocity.x.toFixed(1)}, ${this.ballSnapshot.velocity.z.toFixed(1)})`);
        console.log(`   Délai strict: ${timeSinceLastSnapshot.toFixed(0)}ms ≥ ${this.MIN_SNAPSHOT_INTERVAL}ms ✅`);
        console.log(`   Stats: ${this.snapshotSuccessful}/${this.snapshotAttempts} (${this.snapshotBlocked} bloqués)`);
        
        // Vérification de la vélocité
        const minVelocityThreshold = this.difficulty === AIDifficulty.EASY ? 
            BALL_CONFIG.PHYSICS.INITIAL_SPEED * 0.2 : 
            BALL_CONFIG.PHYSICS.INITIAL_SPEED * 0.8;
        
        if (this.ballSnapshot.velocity.length() < minVelocityThreshold) {
            console.warn(`⚠️ Snapshot avec vélocité trop faible: ${this.ballSnapshot.velocity.length().toFixed(1)}`);
            this.ballSnapshot = null;
            return false;
        }
        
        return true;
    }

    /**
     * FORCE UN SNAPSHOT - RESET COMPLET
     */
    public forceSnapshot(): void {
        console.log("🔄 Snapshot forcé - Reset complet du système de vérification");
        
        // Reset complet
        this.lastSnapshotTime = 0;
        this.ballSnapshot = null;
        this.pendingSnapshots = [];
        
        // Reset des compteurs de debug
        this.snapshotAttempts = 0;
        this.snapshotBlocked = 0;
        this.snapshotSuccessful = 0;
        
        console.log(`✅ Système réinitialisé - Prochain snapshot autorisé immédiatement`);
    }

    /**
     * RESET DU SYSTÈME
     */
    public reset(): void {
        this.ballSnapshot = null;
        this.lastSnapshotTime = 0;
        this.pendingSnapshots = [];
        this.snapshotAttempts = 0;
        this.snapshotBlocked = 0;
        this.snapshotSuccessful = 0;
        this.ballAccessAttempts = 0;
        this.ballAccessBlocked = 0;
    }

    // Getters
    public getCurrentSnapshot(): BallSnapshot | null {
        return this.ballSnapshot;
    }

    public getStrictAccessStats(): string {
        const accessRate = this.ballAccessAttempts > 0 ? 
            ((this.ballAccessAttempts - this.ballAccessBlocked) / this.ballAccessAttempts * 100).toFixed(1) : '0.0';
        
        return `Accès balle: ${this.ballAccessAttempts - this.ballAccessBlocked}/${this.ballAccessAttempts} (${accessRate}%) | Bloqués: ${this.ballAccessBlocked}`;
    }

    public getSnapshotStats(): string {
        const successRate = this.snapshotAttempts > 0 ? 
            ((this.snapshotSuccessful / this.snapshotAttempts) * 100).toFixed(1) : '0.0';
        
        const timeSinceLastSnapshot = performance.now() - this.lastSnapshotTime;
        const delayStatus = timeSinceLastSnapshot >= this.MIN_SNAPSHOT_INTERVAL ? '✅' : '⏳';
        
        return `Snapshots STRICTS: ${this.snapshotSuccessful}/${this.snapshotAttempts} (${successRate}%) | Bloqués: ${this.snapshotBlocked} | Délai: ${timeSinceLastSnapshot.toFixed(0)}ms ${delayStatus}`;
    }

    public getLastSnapshotTime(): number {
        return this.lastSnapshotTime;
    }

    public getMinSnapshotInterval(): number {
        return this.MIN_SNAPSHOT_INTERVAL;
    }

    // Nouvelles méthodes pour accéder aux compteurs
    public incrementSnapshotBlocked(): void {
        this.snapshotBlocked++;
    }

    public incrementBallAccessAttempts(): void {
        this.ballAccessAttempts++;
    }

    public incrementBallAccessBlocked(): void {
        this.ballAccessBlocked++;
    }

    public getBallAccessBlocked(): number {
        return this.ballAccessBlocked;
    }

    public getBallAccessAttempts(): number {
        return this.ballAccessAttempts;
    }

    public getSnapshotAttempts(): number {
        return this.snapshotAttempts;
    }

    public getSnapshotSuccessful(): number {
        return this.snapshotSuccessful;
    }

    public getSnapshotBlocked(): number {
        return this.snapshotBlocked;
    }

    public incrementSnapshotAttempts(): void {
        this.snapshotAttempts++;
    }

    public getPendingSnapshots(): PendingSnapshot[] {
        return this.pendingSnapshots;
    }

    public addPendingSnapshot(snapshot: PendingSnapshot): void {
        this.pendingSnapshots.push(snapshot);
        this.pendingSnapshots.sort((a, b) => a.priority - b.priority);
    }
}
