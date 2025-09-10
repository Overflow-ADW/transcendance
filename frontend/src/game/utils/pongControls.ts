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
    
    // NOUVEAU : Système de glissement pour Player2 - VERSION TRÈS LOURDE
    private player2Velocity = 0; // Vélocité actuelle de Player2
    private readonly player2MaxSpeed = 2.5; // Vitesse maximale TRÈS RÉDUITE (était 4)
    private readonly player2Acceleration = 0.3; // Accélération TRÈS RÉDUITE (était 0.6)
    private readonly player2Friction = 0.995; // Friction TRÈS RÉDUITE pour glissement extrême (était 0.98)
    private readonly player2BounceForce = 1.0; // Force de rebond COMPLÈTE

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
        
        // NOUVEAU : Désactiver les collisions automatiques pour la balle dès qu'elle est référencée
        if (this.ballMesh) {
            this.ballMesh.checkCollisions = false;
            this.ballMesh.isPickable = false;
            this.ballMesh.doNotSyncBoundingInfo = true;
            // console.log removed
        }
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
        // console.log removed

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
        // console.log removed
    }

    /**
     * Active l'IA (Player1 sera contrôlé par l'IA)
     */
    public activateAI(): void {
        if (this.ai) {
            this.ai.activate();
            // console.log removed
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
            // console.log removed
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
                // console.log removed
                if (aiUpPressed) {
                    // console.log removed
                    this.movePlayer(this.player1, PlayerKeys.UP);
                    // console.log removed
                }
                if (aiDownPressed) {
                    // console.log removed
                    this.movePlayer(this.player1, PlayerKeys.DOWN);
                    // console.log removed
                }
            } else {
                // console.log removed
            }
        }

        // Player 2 movement (paddle verte au centre) - seulement si disponible
        if (this.player2) {
            this.updatePlayer2Movement();
        }
    }

    /**
     * AMÉLIORATION : isAnyKeyPressed avec debug conditionnel
     */
    private isAnyKeyPressed(keys: string[]): boolean {
        const pressed = keys.some(key => this.keysPressed[key]);
        
    // console.log removed
        
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
            // console.log removed
        } else if (direction === PlayerKeys.DOWN && currentZ > this.movement.minZ) {
            const newZ = currentZ - this.movement.speed;
            player.position = new Vector3(
                player.position.x,
                player.position.y,
                newZ
            );
            // console.log removed
        } else {
            // console.log removed
        }
    }

    //Définir le player2
    public setPlayer2(player2Mesh: Mesh): void {
    this.player2 = player2Mesh;
    // console.log removed
    }

    //Vérifier si player2 est disponible
    public hasPlayer2(): boolean {
        return this.player2 !== null;
    }

    // NOUVELLE MÉTHODE : Système de glissement pour Player2
    private updatePlayer2Movement(): void {
        if (!this.player2) return;

        const player2UpPressed = this.isAnyKeyPressed(this.player2UpKeys);
        const player2DownPressed = this.isAnyKeyPressed(this.player2DownKeys);
        
        // Appliquer l'accélération basée sur les touches pressées
        if (player2UpPressed && !player2DownPressed) {
            // Accélérer vers le haut
            this.player2Velocity = Math.min(this.player2Velocity + this.player2Acceleration, this.player2MaxSpeed);
        } else if (player2DownPressed && !player2UpPressed) {
            // Accélérer vers le bas
            this.player2Velocity = Math.max(this.player2Velocity - this.player2Acceleration, -this.player2MaxSpeed);
        } else {
            // Aucune touche pressée ou les deux : appliquer la friction
            this.player2Velocity *= this.player2Friction;
            
            // Arrêter complètement si la vitesse est très faible - SEUIL RÉDUIT
            if (Math.abs(this.player2Velocity) < 0.05) { // Réduit de 0.1 à 0.05
                this.player2Velocity = 0;
            }
        }
        
        // Calculer la nouvelle position
        const currentZ = this.player2.position.z;
        let newZ = currentZ + this.player2Velocity;
        
        // Vérifier les collisions avec les limites et rebondir
        let bounced = false;
        
        if (newZ > this.movement.maxZ) {
            // Collision avec le haut : rebondir COMPLÈTEMENT
            newZ = this.movement.maxZ;
            this.player2Velocity = -Math.abs(this.player2Velocity) * this.player2BounceForce; // Force complète
            bounced = true;
            // console.log removed
        } else if (newZ < this.movement.minZ) {
            // Collision avec le bas : rebondir COMPLÈTEMENT
            newZ = this.movement.minZ;
            this.player2Velocity = Math.abs(this.player2Velocity) * this.player2BounceForce; // Force complète
            bounced = true;
            // console.log removed
        }
        
        // Appliquer la nouvelle position
        this.player2.position = new Vector3(
            this.player2.position.x,
            this.player2.position.y,
            newZ
        );
        
        // Debug occasionnel pour voir l'état du glissement
    // console.log removed
        
        // NOUVEAU : Créer un effet visuel lors des rebonds
        if (bounced) {
            this.createPlayer2BounceEffect(newZ > 0);
        }
    }
    
    // NOUVELLE MÉTHODE : Effet visuel de rebond pour Player2 - CORRIGÉ
    private createPlayer2BounceEffect(isTopBounce: boolean): void {
        if (!this.player2) return;
        
        // CORRECTION : Préserver la couleur verte lors du flash
        const material = this.player2.material as any;
        if (material && material.emissiveColor) {
            const originalEmissive = material.emissiveColor.clone();
            
            // Flash vert brillant au lieu de blanc pour préserver l'identité
            const brightGreen = new Vector3(0, 2, 0); // Vert super brillant
            material.emissiveColor = brightGreen;
            
            // Restaurer la couleur verte originale après 200ms (plus long)
            setTimeout(() => {
                material.emissiveColor = originalEmissive;
            }, 200); // Augmenté de 150ms à 200ms
        }
        // console.log removed
    }
    
    // NOUVELLE MÉTHODE : Réinitialiser la vélocité de Player2
    public resetPlayer2Velocity(): void {
    this.player2Velocity = 0;
    // console.log removed
    }
    
    // NOUVELLE MÉTHODE : Obtenir la vélocité actuelle de Player2 (pour debug)
    public getPlayer2Velocity(): number {
        return this.player2Velocity;
    }
}