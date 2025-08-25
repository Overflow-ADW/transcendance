import { Scene, Mesh, Vector3 } from "@babylonjs/core";
import { CONTROLS_CONFIG } from "@/game/utils/pongValues";
import { PongData, GameState } from "@/game/utils/pongData";
import { PongAI, AIDifficulty, KeyboardSimulator } from "@/game/utils/pongAI";

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
    private scene: Scene;
    private movement: PlayerMovement;
    private player0UpKeys = CONTROLS_CONFIG.KEYS.PLAYER0.UP;
    private player0DownKeys = CONTROLS_CONFIG.KEYS.PLAYER0.DOWN;
    private player1UpKeys = CONTROLS_CONFIG.KEYS.PLAYER1.UP;
    private player1DownKeys = CONTROLS_CONFIG.KEYS.PLAYER1.DOWN;
    private gameData: PongData;
    private controlsLocked = false;
    public ai: PongAI | null = null;
    private ballMesh: Mesh | null = null;
    private keySimulator: KeyboardSimulator | null = null;

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

    /**
     * Définit la référence à la balle (à appeler après sa création)
     * @param ball Référence au mesh de la balle
     */
    public setBallReference(ball: Mesh): void {
        this.ballMesh = ball;
        console.log("Référence balle définie pour l'IA:", ball.name);
    }

    private setupKeyboardControls(): void {
        window.addEventListener("keydown", (evt) => {
            this.keysPressed[evt.key] = true;
        });

        window.addEventListener("keyup", (evt) => {
            this.keysPressed[evt.key] = false;
        });
    }

    /**
     * Verrouille ou déverrouille les contrôles des joueurs
     */
    public setControlsLocked(locked: boolean): void {
        this.controlsLocked = locked;
    }

    /**
     * Met à jour la vitesse de mouvement des joueurs
     * @param speed Nouvelle vitesse
     */
    public setMovementSpeed(speed: number): void {
        this.movement.speed = speed;
    }

    /**
     * Met à jour les limites de mouvement des joueurs
     * @param maxZ Limite supérieure
     * @param minZ Limite inférieure
     */
    public setMovementLimits(maxZ: number, minZ: number): void {
        this.movement.maxZ = maxZ;
        this.movement.minZ = minZ;
    }

    /**
     * Met à jour la configuration complète du mouvement
     * @param movement Nouvelle configuration de mouvement
     */
    public setMovementConfig(movement: PlayerMovement): void {
        this.movement = movement;
    }

    /**
     * Obtient la configuration actuelle du mouvement
     */
    public getMovementConfig(): PlayerMovement {
        return { ...this.movement };
    }

    /**
     * Configure l'IA pour contrôler Player1
     */
    public setupAI(difficulty: AIDifficulty = AIDifficulty.MEDIUM): void {
        // Utiliser la référence stockée ou chercher dans la scène
        const ballMesh = this.ballMesh || this.scene.getMeshByName("ball") as Mesh;
        
        if (!ballMesh) {
            console.error("ERREUR IA: Impossible de trouver la balle pour configurer l'IA");
            return;
        }

        console.log("Configuration IA avec:", {
            player1: this.player1.name,
            ball: ballMesh.name,
            difficulty: difficulty
        });

        // Créer le simulateur de touches
        this.keySimulator = new KeyboardSimulator(window);

        // Créer l'IA avec les bons paramètres
        this.ai = new PongAI(
            this.player1,
            ballMesh,
            () => this.gameData.gameState,
            this.keySimulator,
            difficulty
        );
        
        console.log(`IA configurée - Difficulté: ${this.ai.getDifficultyName()}`);
    }

    /**
     * Active l'IA (Player1 sera contrôlé par l'IA)
     */
    public activateAI(): void {
        if (this.ai) {
            this.ai.activate();
            console.log("IA ACTIVÉE avec succès");
        } else {
            console.error("ERREUR: IA non configurée. Appelez setupAI() d'abord.");
        }
    }

    /**
     * Désactive l'IA (Player1 revient aux contrôles manuels)
     */
    public deactivateAI(): void {
        if (this.ai) {
            this.ai.deactivate();
        }
    }

    /**
     * Change la difficulté de l'IA
     */
    public setAIDifficulty(difficulty: AIDifficulty): void {
        if (this.ai) {
            this.ai.setDifficulty(difficulty);
        } else {
            console.warn("IA non configurée. Appelez setupAI() d'abord.");
        }
    }

    /**
     * Obtient le niveau de difficulté actuel de l'IA
     */
    public getAIDifficulty(): AIDifficulty | null {
        return this.ai ? this.ai.getDifficulty() : null;
    }

    /**
     * Vérifie si l'IA est active
     */
    public isAIActive(): boolean {
        return this.ai ? this.ai.isAIActive() : false;
    }

    /**
     * Réinitialise l'IA
     */
    public resetAI(): void {
        if (this.ai) {
            this.ai.reset();
        }
    }

    private updatePlayersPosition(): void {
        // Only update if game is playing and controls are not locked
        if (this.gameData.gameState !== GameState.PLAYING || this.controlsLocked) {
            return;
        }

        // CORRECTION : Mettre à jour l'IA sans paramètre
        if (this.ai) {
            this.ai.update();
        }

        // Player 0 movement (toujours manuel)
        if (this.isAnyKeyPressed(this.player0UpKeys)) {
            this.movePlayer(this.player0, PlayerKeys.UP);
        }
        if (this.isAnyKeyPressed(this.player0DownKeys)) {
            this.movePlayer(this.player0, PlayerKeys.DOWN);
        }

        // Player 1 movement (seulement si l'IA n'est pas active)
        if (!this.ai || !this.ai.isAIActive()) {
            if (this.isAnyKeyPressed(this.player1UpKeys)) {
                console.log("Player1 UP manuel détecté");
                this.movePlayer(this.player1, PlayerKeys.UP);
            }
            if (this.isAnyKeyPressed(this.player1DownKeys)) {
                console.log("Player1 DOWN manuel détecté");
                this.movePlayer(this.player1, PlayerKeys.DOWN);
            }
        } else {
            // DEBUG : Vérifier si l'IA simule correctement les touches
            if (this.isAnyKeyPressed(this.player1UpKeys)) {
                console.log("IA: Touche UP détectée par le système de contrôle");
                this.movePlayer(this.player1, PlayerKeys.UP);
            }
            if (this.isAnyKeyPressed(this.player1DownKeys)) {
                console.log("IA: Touche DOWN détectée par le système de contrôle");
                this.movePlayer(this.player1, PlayerKeys.DOWN);
            }
        }
    }

    private isAnyKeyPressed(keys: string[]): boolean {
        return keys.some(key => this.keysPressed[key]);
    }

    private movePlayer(player: Mesh, direction: PlayerKeys): void {
        const currentZ = player.position.z;
        
        if (direction === PlayerKeys.UP && currentZ < this.movement.maxZ) {
            player.position = new Vector3(
                player.position.x,
                player.position.y,
                currentZ + this.movement.speed
            );
        } else if (direction === PlayerKeys.DOWN && currentZ > this.movement.minZ) {
            player.position = new Vector3(
                player.position.x,
                player.position.y,
                currentZ - this.movement.speed
            );
        }
    }
}