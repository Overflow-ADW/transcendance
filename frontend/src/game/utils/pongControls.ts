import { Scene, Mesh, Vector3 } from "@babylonjs/core";
import { CONTROLS_CONFIG } from "@/game/utils/pongValues";
import { PongData, GameState } from "@/game/utils/pongData";
import { PongAI, AIDifficulty, KeyboardSimulator } from "@/game/utils/AI/pongAI";

export enum PlayerKeys {
    UP,
    DOWN
}

export interface PlayerMovement {
    speed: number;
    maxZ: number;
    minZ: number;
}

export class PongControls {
    private keysPressed: { [key: string]: boolean } = {};
    private players: Array<Mesh | null> = [null, null, null, null];
    private movement: PlayerMovement;
    private engineScene: any;
    public ai: PongAI | null = null;
    private ballRef: Mesh | null = null;
    private controlsLocked = false;

    constructor(
        scene: any,
        player0: Mesh,
        player1: Mesh,
        gameData: PongData,
        movement: PlayerMovement,
        player2?: Mesh | null,
        player3?: Mesh | null
    ) {
        this.engineScene = scene;
        this.players[0] = player0;
        this.players[1] = player1;
        this.players[2] = player2 ?? null;
        this.players[3] = player3 ?? null;
        this.movement = movement;

        // keyboard listeners
        window.addEventListener("keydown", (e) => {
            this.keysPressed[e.key] = true;
        });
        window.addEventListener("keyup", (e) => {
            this.keysPressed[e.key] = false;
        });

        // frame update to move players
        scene.registerBeforeRender(() => {
            if (this.controlsLocked) return;
            const dt = scene.getEngine().getDeltaTime() / 1000; // seconds
            const speedDelta = this.movement.speed * dt;

            // Player 0 (z/S)
            this.movePlayerByKeys(0, CONTROLS_CONFIG.KEYS.PLAYER0.UP, CONTROLS_CONFIG.KEYS.PLAYER0.DOWN, speedDelta);
            // Player 1 (o/l)
            this.movePlayerByKeys(1, CONTROLS_CONFIG.KEYS.PLAYER1.UP, CONTROLS_CONFIG.KEYS.PLAYER1.DOWN, speedDelta);
            // Player 2 (i/k) if present
            this.movePlayerByKeys(2, CONTROLS_CONFIG.KEYS.PLAYER2.UP, CONTROLS_CONFIG.KEYS.PLAYER2.DOWN, speedDelta);
            // Player 3 (Numpad8 / Numpad5) if present
            this.movePlayerByKeys(3, CONTROLS_CONFIG.KEYS.PLAYER3.UP, CONTROLS_CONFIG.KEYS.PLAYER3.DOWN, speedDelta);
        });
    }

    private movePlayerByKeys(index: number, upKeys: string[], downKeys: string[], delta: number) {
        const mesh = this.players[index];
        if (!mesh) return;

        let moving = 0;
        for (const k of upKeys) if (this.keysPressed[k]) moving -= 1;
        for (const k of downKeys) if (this.keysPressed[k]) moving += 1;

        if (moving === 0) return;

        const newZ = mesh.position.z + moving * delta * (this.movement.speed || 1);
        const clampedZ = Math.max(this.movement.minZ, Math.min(this.movement.maxZ, newZ));
        mesh.position.z = clampedZ;
    }

    public setBallReference(ball: Mesh): void {
        this.ballRef = ball;
    }

    public setControlsLocked(locked: boolean): void {
        this.controlsLocked = locked;
    }

    public setMovementSpeed(speed: number): void {
        this.movement.speed = speed;
    }

    public setMovementLimits(maxZ: number, minZ: number): void {
        this.movement.maxZ = maxZ;
        this.movement.minZ = minZ;
    }

    public setMovementConfig(movement: PlayerMovement): void {
        this.movement = movement;
    }

    public getMovementConfig(): PlayerMovement {
        return this.movement;
    }

    // AI related stubs (preserve existing API)
    public setupAI(difficulty: AIDifficulty = AIDifficulty.MEDIUM): void { /* existing AI initialization */ }
    public activateAI(): void { /* activate */ }
    public deactivateAI(): void { /* deactivate */ }
    public setAIDifficulty(difficulty: AIDifficulty): void { /* set difficulty */ }
    public getAIDifficulty(): AIDifficulty | null { return null; }
    public isAIActive(): boolean { return false; }
    public resetAI(): void { /* reset */ }
}