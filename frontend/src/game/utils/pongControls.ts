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
    private player0: Mesh;
    private player1: Mesh;
    private player2: Mesh | null = null;
    private scene: Scene;
    private movement: PlayerMovement;
    private player0UpKeys = CONTROLS_CONFIG.KEYS.PLAYER0.UP;
    private player0DownKeys = CONTROLS_CONFIG.KEYS.PLAYER0.DOWN;
    private player1UpKeys = CONTROLS_CONFIG.KEYS.PLAYER1.UP;
    private player1DownKeys = CONTROLS_CONFIG.KEYS.PLAYER1.DOWN;
    private player2UpKeys = CONTROLS_CONFIG.KEYS.PLAYER2.UP;
    private player2DownKeys = CONTROLS_CONFIG.KEYS.PLAYER2.DOWN;
    private gameData: PongData;
    private controlsLocked = false;
    public ai: PongAI | null = null;
    private ballMesh: Mesh | null = null;
    private keySimulator: KeyboardSimulator | null = null;

    private player2Velocity = 0;
    private readonly player2MaxSpeed = 7;
    private readonly player2Acceleration = .8;
    private readonly player2Friction = 0.995;
    private readonly player2BounceForce = 1.0;

    constructor(
        scene: Scene, 
        player0: Mesh, 
        player1: Mesh, 
        gameData: PongData,
        movement: PlayerMovement = { 
            speed: CONTROLS_CONFIG.SPEED, 
            maxZ: CONTROLS_CONFIG.MAX_Z, 
            minZ: CONTROLS_CONFIG.MIN_Z 
        }
    ) {
        this.scene = scene;
        this.player0 = player0;
        this.player1 = player1;
        this.movement = movement;
        this.gameData = gameData;
        
        this.setupKeyboardControls();
        scene.registerBeforeRender(() => this.updatePlayersPosition());
    }

    public setBallReference(ball: Mesh): void {
        this.ballMesh = ball;

        if (this.ballMesh) {
            this.ballMesh.checkCollisions = false;
            this.ballMesh.isPickable = false;
            this.ballMesh.doNotSyncBoundingInfo = true;
            console.log("Référence balle définie pour l'IA et collisions désactivées:", ball.name);
        }
    }    private setupKeyboardControls(): void {
        window.addEventListener("keydown", (evt) => {
            if (this.ai && this.ai.isAIActive() && 
                (this.player1UpKeys.includes(evt.key) || this.player1DownKeys.includes(evt.key)) &&
                !(evt as any).isAIGenerated) {
                return;
            }
            
            this.keysPressed[evt.key] = true;
        });

        window.addEventListener("keyup", (evt) => {
            if (this.ai && this.ai.isAIActive() && 
                (this.player1UpKeys.includes(evt.key) || this.player1DownKeys.includes(evt.key)) &&
                !(evt as any).isAIGenerated) {
                return;
            }
            
            this.keysPressed[evt.key] = false;
        });
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
        return { ...this.movement };
    }

    public setupAI(difficulty: AIDifficulty = AIDifficulty.MEDIUM): void {
        const ballMesh = this.ballMesh || this.scene.getMeshByName("ball") as Mesh;
        
        if (!ballMesh) {
            console.error("ERREUR IA: Impossible de trouver la balle");
            return;
        }

        console.log("Configuration IA avec:", {
            player1: this.player1.name,
            ball: ballMesh.name,
            difficulty: difficulty
        });

        this.keySimulator = new KeyboardSimulator(window);

        this.ai = new PongAI(
            this.player1,
            ballMesh,
            () => this.gameData.gameState,
            this.keySimulator,
            difficulty
        );
        
        console.log(`IA configurée - Difficulté: ${this.ai.getDifficultyName()}`);
    }

    public activateAI(): void {
        if (this.ai) {
            this.ai.activate();
            console.log("IA ACTIVÉE");
        } else {
            console.error("ERREUR: IA non configurée");
        }
    }

    public deactivateAI(): void {
        if (this.ai) {
            this.ai.deactivate();
        }
    }

    public setAIDifficulty(difficulty: AIDifficulty): void {
        if (this.ai) {
            this.ai.setDifficulty(difficulty);
        } else {
            console.warn("IA non configurée. Appelez setupAI() d'abord.");
        }
    }

    public getAIDifficulty(): AIDifficulty | null {
        return this.ai ? this.ai.getDifficulty() : null;
    }

    public isAIActive(): boolean {
        return this.ai ? this.ai.isAIActive() : false;
    }

    public resetAI(): void {
        if (this.ai) {
            this.ai.reset();
        }
    }

    private updatePlayersPosition(): void {
        if (this.gameData.gameState !== GameState.PLAYING || this.controlsLocked) {
            return;
        }

        if (this.ai && this.ai.isAIActive()) {
            this.ai.update();
            
            if (Math.random() < 0.016) {
                const debugInfo = this.ai.getDebugInfo();
            }
        }

        const player0UpPressed = this.isAnyKeyPressed(this.player0UpKeys);
        const player0DownPressed = this.isAnyKeyPressed(this.player0DownKeys);
        
        if (player0UpPressed) {
            this.movePlayer(this.player0, PlayerKeys.UP);
        }
        if (player0DownPressed) {
            this.movePlayer(this.player0, PlayerKeys.DOWN);
        }
        const player1UpPressed = this.isAnyKeyPressed(this.player1UpKeys);
        const player1DownPressed = this.isAnyKeyPressed(this.player1DownKeys);
        
        if (player1UpPressed) {
            this.movePlayer(this.player1, PlayerKeys.UP);
        }
        if (player1DownPressed) {
            this.movePlayer(this.player1, PlayerKeys.DOWN);
        }

        if ((player1UpPressed || player1DownPressed) && Math.random() < 0.05) {
            if (this.ai && this.ai.isAIActive()) {
                console.log("Mouvement Player1 contrôlé par l'IA");
            } else {
                console.log("Mouvement Player1 contrôlé par le joueur humain");
            }
        }
        if (this.player2) {
            this.updatePlayer2Movement();
        }
    }

    private isAnyKeyPressed(keys: string[]): boolean {
        const pressed = keys.some(key => this.keysPressed[key]);

        if (pressed && Math.random() < 0.1) {
            const pressedKeys = keys.filter(key => this.keysPressed[key]);
        }
        
        return pressed;
    }

    private movePlayer(player: Mesh, direction: PlayerKeys): void {
        const currentZ = player.position.z;
        const playerName = player.name;
        
        if (direction === PlayerKeys.UP && currentZ < this.movement.maxZ) {
            const newZ = currentZ + this.movement.speed;
            player.position = new Vector3(
                player.position.x,
                player.position.y,
                newZ
            );

            if (playerName === 'player1' && this.ai && this.ai.isAIActive()) {
                console.log(`IA: ${currentZ.toFixed(1)} -> ${newZ.toFixed(1)} (+${this.movement.speed})`);
            }
        } else if (direction === PlayerKeys.DOWN && currentZ > this.movement.minZ) {
            const newZ = currentZ - this.movement.speed;
            player.position = new Vector3(
                player.position.x,
                player.position.y,
                newZ
            );
            if (playerName === 'player1' && this.ai && this.ai.isAIActive()) {
                console.log(`⬇️ IA: ${currentZ.toFixed(1)} -> ${newZ.toFixed(1)} (-${this.movement.speed})`);
            }
        } else {
            // Log des limites pour l'IA
            if (playerName === 'player1' && this.ai && this.ai.isAIActive()) {
                if (direction === PlayerKeys.UP) {
                    console.log(`IA: Limite UP atteinte - ${currentZ.toFixed(1)} >= ${this.movement.maxZ}`);
                } else {
                    console.log(`IA: Limite DOWN atteinte - ${currentZ.toFixed(1)} <= ${this.movement.minZ}`);
                }
            }
        }
    }

    public setPlayer2(player2Mesh: Mesh): void {
        this.player2 = player2Mesh;
    }

    public hasPlayer2(): boolean {
        return this.player2 !== null;
    }

    private updatePlayer2Movement(): void {
        if (!this.player2) return;

        const player2UpPressed = this.isAnyKeyPressed(this.player2UpKeys);
        const player2DownPressed = this.isAnyKeyPressed(this.player2DownKeys);

        if (player2UpPressed && !player2DownPressed) {
            this.player2Velocity = Math.min(this.player2Velocity + this.player2Acceleration, this.player2MaxSpeed);
        } else if (player2DownPressed && !player2UpPressed) {
            this.player2Velocity = Math.max(this.player2Velocity - this.player2Acceleration, -this.player2MaxSpeed);
        } else {
            this.player2Velocity *= this.player2Friction;
            if (Math.abs(this.player2Velocity) < 0.05) {
                this.player2Velocity = 0;
            }
        }

        const currentZ = this.player2.position.z;
        let newZ = currentZ + this.player2Velocity;

        let bounced = false;
        
        if (newZ > this.movement.maxZ) {
            newZ = this.movement.maxZ;
            this.player2Velocity = -Math.abs(this.player2Velocity) * this.player2BounceForce;
            bounced = true;
        } else if (newZ < this.movement.minZ) {
            newZ = this.movement.minZ;
            this.player2Velocity = Math.abs(this.player2Velocity) * this.player2BounceForce;
            bounced = true;
        }

        this.player2.position = new Vector3(
            this.player2.position.x,
            this.player2.position.y,
            newZ
        );
        // Debug log
        if (Math.random() < 0.005 && Math.abs(this.player2Velocity) > 0.05) { // Seuil ajusté
            console.log(`🎮 Player2 - Pos: ${currentZ.toFixed(1)} -> ${newZ.toFixed(1)}, Vitesse: ${this.player2Velocity.toFixed(2)}${bounced ? ' [REBOND]' : ''}`);
        }

        if (bounced) {
            this.createPlayer2BounceEffect(newZ > 0);
        }
    }

    private createPlayer2BounceEffect(isTopBounce: boolean): void {
        if (!this.player2) return;
        
        const material = this.player2.material as any;
        if (material && material.emissiveColor) {
            const originalEmissive = material.emissiveColor.clone();

            const brightGreen = new Vector3(0, 2, 0);
            material.emissiveColor = brightGreen;
            setTimeout(() => {
                material.emissiveColor = originalEmissive;
            }, 200);
        }
    }

    public resetPlayer2Velocity(): void {
        this.player2Velocity = 0;
    }
    public getPlayer2Velocity(): number {
        return this.player2Velocity;
    }
}