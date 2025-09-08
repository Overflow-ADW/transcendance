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
    public ai: PongAI | null = null; // CORRECTION: Rendre public pour permettre l'accès depuis pongGame
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

    /**
     * CORRECTION : updatePlayersPosition avec logs détaillés pour debug IA
     */
    private updatePlayersPosition(): void {
        // Only update if game is playing and controls are not locked
        if (this.gameData.gameState !== GameState.PLAYING || this.controlsLocked) {
            return;
        }

        // CORRECTION : Mettre à jour l'IA en premier avec debug
        if (this.ai && this.ai.isAIActive()) {
            this.ai.update();
            
            // DEBUG : Vérifier l'état de l'IA toutes les 60 frames (~1 seconde)
            if (Math.random() < 0.016) { // ~1/60 chance
                const debugInfo = this.ai.getDebugInfo();
                console.log(`🤖 État IA: ${debugInfo}`);
            }
        }

        // Player 0 movement (toujours manuel)
        const player0UpPressed = this.isAnyKeyPressed(this.player0UpKeys);
        const player0DownPressed = this.isAnyKeyPressed(this.player0DownKeys);
        
        if (player0UpPressed) {
            this.movePlayer(this.player0, PlayerKeys.UP);
        }
        if (player0DownPressed) {
            this.movePlayer(this.player0, PlayerKeys.DOWN);
        }

        // CORRECTION MAJEURE : Player 1 movement avec debug détaillé
        if (!this.ai || !this.ai.isAIActive()) {
            // Contrôles manuels pour Player 1
            const player1UpPressed = this.isAnyKeyPressed(this.player1UpKeys);
            const player1DownPressed = this.isAnyKeyPressed(this.player1DownKeys);
            
            if (player1UpPressed) {
                this.movePlayer(this.player1, PlayerKeys.UP);
            }
            if (player1DownPressed) {
                this.movePlayer(this.player1, PlayerKeys.DOWN);
            }
        } else {
            // IA active - vérifier les touches simulées
            const aiUpPressed = this.isAnyKeyPressed(this.player1UpKeys);
            const aiDownPressed = this.isAnyKeyPressed(this.player1DownKeys);
            
            if (aiUpPressed || aiDownPressed) {
                console.log(`🎮 IA TOUCHES DÉTECTÉES - UP: ${aiUpPressed}, DOWN: ${aiDownPressed}`);
                
                if (aiUpPressed) {
                    console.log(`⬆️ IA: Mouvement UP détecté - Position avant: ${this.player1.position.z.toFixed(1)}`);
                    this.movePlayer(this.player1, PlayerKeys.UP);
                    console.log(`⬆️ IA: Position après: ${this.player1.position.z.toFixed(1)}`);
                }
                if (aiDownPressed) {
                    console.log(`⬇️ IA: Mouvement DOWN détecté - Position avant: ${this.player1.position.z.toFixed(1)}`);
                    this.movePlayer(this.player1, PlayerKeys.DOWN);
                    console.log(`⬇️ IA: Position après: ${this.player1.position.z.toFixed(1)}`);
                }
            } else {
                // Debug périodique de l'état des touches
                if (Math.random() < 0.01) { // ~1% chance pour éviter le spam
                    console.log(`🔍 DEBUG IA: Aucune touche détectée`);
                    console.log(`   Touches UP attendues: ${this.player1UpKeys.join(', ')}`);
                    console.log(`   Touches DOWN attendues: ${this.player1DownKeys.join(', ')}`);
                    console.log(`   État touches: ${Object.keys(this.keysPressed).filter(k => this.keysPressed[k]).join(', ') || 'Aucune'}`);
                }
            }
        }

        // Player 2 movement (paddle verte au centre) - seulement si disponible
        if (this.player2) {
            const player2UpPressed = this.isAnyKeyPressed(this.player2UpKeys);
            const player2DownPressed = this.isAnyKeyPressed(this.player2DownKeys);
            
            if (player2UpPressed) {
                this.movePlayer(this.player2, PlayerKeys.UP);
            }
            if (player2DownPressed) {
                this.movePlayer(this.player2, PlayerKeys.DOWN);
            }
        }
    }

    /**
     * AMÉLIORATION : isAnyKeyPressed avec debug conditionnel
     */
    private isAnyKeyPressed(keys: string[]): boolean {
        const pressed = keys.some(key => this.keysPressed[key]);
        
        // Debug seulement si une touche est pressée
        if (pressed && Math.random() < 0.1) { // 10% chance de log quand pressée
            const pressedKeys = keys.filter(key => this.keysPressed[key]);
            console.log(`🔑 Touche(s) pressée(s): ${pressedKeys.join(', ')}`);
        }
        
        return pressed;
    }

    /**
     * AMÉLIORATION : movePlayer avec logs de position
     */
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
            
            // Log pour l'IA seulement
            if (playerName === 'player1' && this.ai && this.ai.isAIActive()) {
                console.log(`⬆️ IA: ${currentZ.toFixed(1)} -> ${newZ.toFixed(1)} (+${this.movement.speed})`);
            }
        } else if (direction === PlayerKeys.DOWN && currentZ > this.movement.minZ) {
            const newZ = currentZ - this.movement.speed;
            player.position = new Vector3(
                player.position.x,
                player.position.y,
                newZ
            );
            
            // Log pour l'IA seulement
            if (playerName === 'player1' && this.ai && this.ai.isAIActive()) {
                console.log(`⬇️ IA: ${currentZ.toFixed(1)} -> ${newZ.toFixed(1)} (-${this.movement.speed})`);
            }
        } else {
            // Log des limites pour l'IA
            if (playerName === 'player1' && this.ai && this.ai.isAIActive()) {
                if (direction === PlayerKeys.UP) {
                    console.log(`🚧 IA: Limite UP atteinte - ${currentZ.toFixed(1)} >= ${this.movement.maxZ}`);
                } else {
                    console.log(`🚧 IA: Limite DOWN atteinte - ${currentZ.toFixed(1)} <= ${this.movement.minZ}`);
                }
            }
        }
    }

    //Définir le player2
    public setPlayer2(player2Mesh: Mesh): void {
        this.player2 = player2Mesh;
        console.log("Player2 ajouté aux contrôles:", player2Mesh.name);
    }

    //Vérifier si player2 est disponible
    public hasPlayer2(): boolean {
        return this.player2 !== null;
    }
}