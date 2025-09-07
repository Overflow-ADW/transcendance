import { Scene, Mesh, Vector3 } from "@babylonjs/core";
import { FourPlayerData, FourPlayerGameState } from "./FourPlayerData";
import { CONTROLS_CONFIG, FOUR_PLAYER_CONFIG } from "./pongValues";

/**
 * Gestionnaire des contrôles pour le mode 4 joueurs
 */
export class FourPlayerControls {
    private scene: Scene;
    private players: Mesh[];
    private gameData: FourPlayerData;
    private keysPressed: { [key: string]: boolean } = {};
    private controlsLocked = false;
    private keyboardObserver: any = null; // Pour pouvoir nettoyer l'observer

    // Configurations des touches pour chaque joueur
    private playerKeys = [
        { up: CONTROLS_CONFIG.KEYS.PLAYER0.UP, down: CONTROLS_CONFIG.KEYS.PLAYER0.DOWN },
        { up: CONTROLS_CONFIG.KEYS.PLAYER1.UP, down: CONTROLS_CONFIG.KEYS.PLAYER1.DOWN },
        { up: CONTROLS_CONFIG.KEYS.PLAYER2.UP, down: CONTROLS_CONFIG.KEYS.PLAYER2.DOWN },
        { up: CONTROLS_CONFIG.KEYS.PLAYER3.UP, down: CONTROLS_CONFIG.KEYS.PLAYER3.DOWN }
    ];

    constructor(scene: Scene, players: Mesh[], gameData: FourPlayerData) {
        this.scene = scene;
        this.players = players;
        this.gameData = gameData;

        this.setupKeyboardControls();
        this.setupMovementLoop();
    }

    /**
     * Configure les contrôles clavier avec observer dédié
     */
    private setupKeyboardControls(): void {
        this.keyboardObserver = this.scene.onKeyboardObservable.add((kbInfo: any) => {
            // Vérifier que nous sommes en mode 4 joueurs
            if (this.gameData.gameState !== FourPlayerGameState.PLAYING) return;
            
            const key = kbInfo.event.key;
            
            // Vérifier que la touche appartient bien au mode 4 joueurs
            if (!this.isFourPlayerKey(key)) return;
            
            if (kbInfo.type === 1) { // BABYLON.KeyboardEventTypes.KEYDOWN
                this.keysPressed[key] = true;
            } else if (kbInfo.type === 2) { // BABYLON.KeyboardEventTypes.KEYUP
                this.keysPressed[key] = false;
            }
        });
    }

    /**
     * Vérifie si une touche appartient au mode 4 joueurs
     */
    private isFourPlayerKey(key: string): boolean {
        return this.playerKeys.some(playerKey => 
            playerKey.up.includes(key) || playerKey.down.includes(key)
        );
    }

    /**
     * Configure la boucle de mouvement
     */
    private setupMovementLoop(): void {
        this.scene.registerBeforeRender(() => {
            if (!this.controlsLocked && this.gameData.gameState === FourPlayerGameState.PLAYING) {
                this.updatePlayerMovements();
            }
        });
    }

    /**
     * Met à jour les mouvements de tous les joueurs
     */
    private updatePlayerMovements(): void {
        this.players.forEach((player, index) => {
            if (this.gameData.isPlayerActive(index) && player.isVisible) {
                this.updatePlayerMovement(player, index);
            }
        });
    }

    /**
     * Met à jour le mouvement d'un joueur spécifique
     */
    private updatePlayerMovement(player: Mesh, playerIndex: number): void {
        const keys = this.playerKeys[playerIndex];
        const speed = CONTROLS_CONFIG.SPEED;
        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
        const movement = speed * deltaTime * 60;

        let upPressed = false;
        let downPressed = false;

        // Vérifier les touches "up" pour ce joueur
        keys.up.forEach(key => {
            if (this.keysPressed[key]) upPressed = true;
        });

        // Vérifier les touches "down" pour ce joueur
        keys.down.forEach(key => {
            if (this.keysPressed[key]) downPressed = true;
        });

        // Utiliser les nouvelles limites de mouvement configurées
        if (playerIndex <= 1) {
            // Joueurs 0 et 1 (gauche et droite) - mouvement vertical (axe Z)
            const maxZ = FOUR_PLAYER_CONFIG.MOVEMENT_LIMITS.VERTICAL_Z.MAX;
            const minZ = FOUR_PLAYER_CONFIG.MOVEMENT_LIMITS.VERTICAL_Z.MIN;
            
            if (upPressed && player.position.z < maxZ) {
                player.position.z = Math.min(player.position.z + movement, maxZ);
            }
            if (downPressed && player.position.z > minZ) {
                player.position.z = Math.max(player.position.z - movement, minZ);
            }
        } else {
            // Joueurs 2 et 3 (haut et bas) - mouvement horizontal (axe X)
            const maxX = FOUR_PLAYER_CONFIG.MOVEMENT_LIMITS.HORIZONTAL_X.MAX;
            const minX = FOUR_PLAYER_CONFIG.MOVEMENT_LIMITS.HORIZONTAL_X.MIN;
            
            if (upPressed && player.position.x < maxX) {
                player.position.x = Math.min(player.position.x + movement, maxX);
            }
            if (downPressed && player.position.x > minX) {
                player.position.x = Math.max(player.position.x - movement, minX);
            }
        }
    }

    /**
     * Verrouille ou déverrouille les contrôles
     */
    public setControlsLocked(locked: boolean): void {
        this.controlsLocked = locked;
    }

    /**
     * Nettoie les ressources
     */
    public cleanup(): void {
        // Nettoyer les observables si nécessaire
        if (this.keyboardObserver) {
            this.scene.onKeyboardObservable.remove(this.keyboardObserver);
            this.keyboardObserver = null;
        }
        this.keysPressed = {};
    }
}