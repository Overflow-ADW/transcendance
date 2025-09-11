import { Vector3, Mesh } from "@babylonjs/core";
import { BallSnapshot, PendingSnapshot, AIDifficulty } from "./aiTypes";
import { BALL_CONFIG } from "@/game/utils/pongValues";

export class SnapshotSystem {
    private ballSnapshot: BallSnapshot | null = null;
    private lastSnapshotTime = 0;
    private readonly MIN_SNAPSHOT_INTERVAL = 1000;
    private pendingSnapshots: PendingSnapshot[] = [];
    
    private snapshotAttempts = 0;
    private snapshotBlocked = 0;
    private snapshotSuccessful = 0;
    private ballAccessAttempts = 0;
    private ballAccessBlocked = 0;

    constructor(private ball: Mesh, private difficulty: AIDifficulty) {}

    private canCreateSnapshot(): boolean {
        const currentTime = performance.now();
        const timeSinceLastSnapshot = currentTime - this.lastSnapshotTime;
        if (timeSinceLastSnapshot < this.MIN_SNAPSHOT_INTERVAL) {
            this.snapshotBlocked++;
            console.log(`Attente de ${this.MIN_SNAPSHOT_INTERVAL - timeSinceLastSnapshot}ms avant de créer un nouveau snapshot.`);
            return false;
        }
        
        return true;
    }

    public queueSnapshotWithPosition(reason: string, priority: number, timestamp: number, preAuthorizedPosition: Vector3, velocity: Vector3): void {
        this.snapshotAttempts++;

        const recentSimilar = this.pendingSnapshots.find(s => 
            s.reason === reason && 
            Math.abs(timestamp - s.timestamp) < 500
        );
        
        if (recentSimilar) {
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
    }

    public queueSnapshot(reason: string, priority: number, timestamp: number, velocity: Vector3): void {
        this.snapshotAttempts++;
        
        // Vérifier si on peut créer un snapshot
        if (!this.canCreateSnapshot()) {
            return;
        }
        
        const recentSimilar = this.pendingSnapshots.find(s => 
            s.reason === reason && 
            Math.abs(timestamp - s.timestamp) < 500
        );
        
        if (recentSimilar) {
            return;
        }
        
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
    }

    public processSnapshotQueue(): void {
        if (this.pendingSnapshots.length === 0) {
            return;
        }

        if (!this.canCreateSnapshot()) {
            return;
        }

        const nextSnapshot = this.pendingSnapshots.shift();
        if (nextSnapshot) {
            const currentTime = performance.now();
            const actualDelay = currentTime - this.lastSnapshotTime;
            this.createSnapshotFromQueue(nextSnapshot);
        }
    }

    private createSnapshotFromQueue(queuedSnapshot: PendingSnapshot): boolean {
        const currentTime = performance.now();

        const timeSinceLastSnapshot = currentTime - this.lastSnapshotTime;
        if (timeSinceLastSnapshot < this.MIN_SNAPSHOT_INTERVAL) {
            this.pendingSnapshots.unshift(queuedSnapshot);
            this.pendingSnapshots.sort((a, b) => a.priority - b.priority);
            return false;
        }
        
        this.ballSnapshot = {
            position: queuedSnapshot.ballPosition,
            velocity: queuedSnapshot.ballVelocity,
            timestamp: queuedSnapshot.timestamp,
            reason: queuedSnapshot.reason
        };

        this.lastSnapshotTime = currentTime;
        this.snapshotSuccessful++;
        
        console.log(` SNAPSHOT POST FILE créé (${queuedSnapshot.reason})`);
        console.log(` Position: (${this.ballSnapshot.position.x.toFixed(1)}, ${this.ballSnapshot.position.z.toFixed(1)})`);
        console.log(` Vélocité: (${this.ballSnapshot.velocity.x.toFixed(1)}, ${this.ballSnapshot.velocity.z.toFixed(1)})`);
        console.log(` Délai: ${timeSinceLastSnapshot.toFixed(0)}ms ≥ ${this.MIN_SNAPSHOT_INTERVAL}ms ✅`);
        console.log(` Stats: ${this.snapshotSuccessful}/${this.snapshotAttempts} (${this.snapshotBlocked} bloqués)`);

        const minVelocityThreshold = this.difficulty === AIDifficulty.EASY ? 
            BALL_CONFIG.PHYSICS.INITIAL_SPEED * 0.2 : 
            BALL_CONFIG.PHYSICS.INITIAL_SPEED * 0.8;
        
        if (this.ballSnapshot.velocity.length() < minVelocityThreshold) {
            this.ballSnapshot = null;
            return false;
        }
        
        return true;
    }

    public forceSnapshot(): void {
        this.lastSnapshotTime = 0;
        this.ballSnapshot = null;
        this.pendingSnapshots = [];
        this.snapshotAttempts = 0;
        this.snapshotBlocked = 0;
        this.snapshotSuccessful = 0;
    }

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
        const delayStatus = timeSinceLastSnapshot >= this.MIN_SNAPSHOT_INTERVAL ? 'OK' : 'WAIT';
        
        return `Snapshots STRICTS: ${this.snapshotSuccessful}/${this.snapshotAttempts} (${successRate}%) | Bloqués: ${this.snapshotBlocked} | Délai: ${timeSinceLastSnapshot.toFixed(0)}ms ${delayStatus}`;
    }

    public getLastSnapshotTime(): number {
        return this.lastSnapshotTime;
    }

    public getMinSnapshotInterval(): number {
        return this.MIN_SNAPSHOT_INTERVAL;
    }

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
