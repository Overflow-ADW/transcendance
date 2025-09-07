import { Scene, Mesh, Vector3, MeshBuilder, StandardMaterial, Tools, Color3 } from "@babylonjs/core";
import { IPongGameMode } from "./DefaultPongMode";
import { GameType } from "@/game/utils/pongData";
import { FourPlayerData, FourPlayerGameConfig, FourPlayerInfo, FourPlayerGameEvents, FourPlayerGameState } from "@/game/utils/FourPlayerData";
import { FourPlayerBall } from "@/game/utils/FourPlayerBall";
import { FourPlayerControls } from "@/game/utils/FourPlayerControls";
import { 
    getGameModeConfig, 
    FOUR_PLAYER_CONFIG, 
    MAIN_COLORS,
    CAMERA_CONFIG
} from "@/game/utils/pongValues";

/**
 * Mode de jeu Pong à 4 joueurs (Battle Royale)
 */
export class FourPlayerPongMode implements IPongGameMode {
    private fourPlayerData: FourPlayerData | null = null;
    private ballManager: FourPlayerBall | null = null;
    private controlsManager: FourPlayerControls | null = null;
    private scene: Scene | null = null;
    private players: Mesh[] = [];
    private walls: Mesh[] = [];
    private eliminatedWalls: Mesh[] = [];
    private parentGame: any = null;

    constructor() {
        // Initialisation spécifique au mode 4 joueurs
    }

    /**
     * Initialise le mode de jeu 4 joueurs
     */
    initialize(
        scene: Scene,
        ball: Mesh,
        player0: Mesh,
        player1: Mesh,
        topWall: Mesh,
        bottomWall: Mesh,
        gameData: any,
        controls: any,
        parent: any,
        glowLayers?: any
    ): void {
        this.scene = scene;
        this.parentGame = parent;

        // Ajuster la balle pour le mode 4 joueurs AVANT de configurer les systèmes
        ball.scaling = new Vector3(
            FOUR_PLAYER_CONFIG.BALL.DIAMETER / 20, // Ratio par rapport à la taille originale
            FOUR_PLAYER_CONFIG.BALL.DIAMETER / 20,
            FOUR_PLAYER_CONFIG.BALL.DIAMETER / 20
        );

        // DÉSACTIVER COMPLÈTEMENT le mode 2 joueurs
        player0.isVisible = false;
        player1.isVisible = false;
        topWall.isVisible = false;
        bottomWall.isVisible = false;
        
        // Désactiver les collisions des éléments 2 joueurs
        player0.setEnabled(false);
        player1.setEnabled(false);
        topWall.setEnabled(false);
        bottomWall.setEnabled(false);
        
        // Cacher TOUS les éléments du mode 2 joueurs
        const elementsToHide = [
            "topWallPlane", "bottomWallPlane", 
            "player0", "player1", 
            "topWall", "bottomWall",
            "scoreDisplay0", "scoreDisplay1",
            "playerNameDisplay0", "playerNameDisplay1"
        ];
        
        elementsToHide.forEach(elementName => {
            const element = scene.getMeshByName(elementName);
            if (element) {
                element.isVisible = false;
                element.setEnabled(false);
            }
        });

        // Stopper COMPLÈTEMENT le système du mode 2 joueurs
        if (controls) {
            controls.setControlsLocked(true);
        }
        
        // Stopper le gameData du mode 2 joueurs pour éviter les conflits
        if (gameData) {
            gameData.gameState = 'PAUSED'; // Mettre en pause pour éviter les updates
        }

        // Ajuster la caméra pour le mode 4 joueurs (reculer de 200 unités)
        const camera = scene.getCameraByName("camera");
        if (camera) {
            camera.position.y = CAMERA_CONFIG.HEIGHT + 200; // Reculer la caméra
        }

        // Récupérer les joueurs du localStorage
        const savedPlayers = localStorage.getItem('multiplayer-players');
        let playerInfos: FourPlayerInfo[] = [];

        if (savedPlayers) {
            const multiplayerPlayers = JSON.parse(savedPlayers);
            playerInfos = multiplayerPlayers.map((p: any, index: number) => ({
                id: index,
                name: p.name,
                color: p.color,
                isActive: true,
                isEliminated: false
            }));
        } else {
            // Configuration par défaut
            playerInfos = [
                { id: 0, name: "PLAYER 1", color: MAIN_COLORS.HEX_BLUE, isActive: true, isEliminated: false },
                { id: 1, name: "PLAYER 2", color: MAIN_COLORS.HEX_PURPLE, isActive: true, isEliminated: false },
                { id: 2, name: "PLAYER 3", color: MAIN_COLORS.HEX_YELLOW, isActive: true, isEliminated: false },
                { id: 3, name: "PLAYER 4", color: MAIN_COLORS.HEX_GREEN, isActive: true, isEliminated: false }
            ];
        }

        // Créer le gestionnaire de données pour 4 joueurs
        this.fourPlayerData = new FourPlayerData({ players: playerInfos });

        // Créer les 4 joueurs
        this.createFourPlayers(scene, playerInfos);

        // Créer les murs colorés pour chaque joueur
        this.createPlayerWalls(scene);

        // Configurer les contrôles pour 4 joueurs
        this.controlsManager = new FourPlayerControls(scene, this.players, this.fourPlayerData);

        // Configurer le gestionnaire de balle pour 4 joueurs
        const modeConfig = getGameModeConfig(GameType.FOUR_PLAYER_PONG);
        this.ballManager = new FourPlayerBall(
            scene,
            ball,
            this.players,
            this.walls, // Passer les murs colorés au gestionnaire de balle
            this.fourPlayerData,
            {
                initialSpeed: modeConfig.BALL_PHYSICS.INITIAL_SPEED,
                speedIncrement: modeConfig.BALL_PHYSICS.SPEED_INCREMENT,
                maxSpeed: modeConfig.BALL_PHYSICS.MAX_SPEED
            },
            this.parentGame
        );

        // Configurer les événements
        this.setupEventListeners();

        // Démarrer le jeu
        this.fourPlayerData.startGame();
    }

    /**
     * Crée les 4 joueurs avec leurs positions et couleurs
     */
    private createFourPlayers(scene: Scene, playerInfos: FourPlayerInfo[]): void {
        const positions = [
            FOUR_PLAYER_CONFIG.PLAYER0_POSITION, // Left (X: -490, Z: 0)
            FOUR_PLAYER_CONFIG.PLAYER1_POSITION, // Right (X: 490, Z: 0)
            FOUR_PLAYER_CONFIG.PLAYER2_POSITION, // Top (X: 0, Z: 490)
            FOUR_PLAYER_CONFIG.PLAYER3_POSITION  // Bottom (X: 0, Z: -490)
        ];

        playerInfos.forEach((info, index) => {
            // Déterminer les dimensions selon la position
            const isHorizontal = index >= 2; // Players 2 et 3 (top/bottom) sont horizontaux
            const width = isHorizontal ? FOUR_PLAYER_CONFIG.PLAYER_WIDTH : FOUR_PLAYER_CONFIG.PLAYER_DEPTH;
            const depth = isHorizontal ? FOUR_PLAYER_CONFIG.PLAYER_DEPTH : FOUR_PLAYER_CONFIG.PLAYER_WIDTH;

            // Nom unique pour éviter les conflits
            const player = MeshBuilder.CreateBox(`fourPlayer_${index}_${Date.now()}`, {
                width: width,
                height: FOUR_PLAYER_CONFIG.PLAYER_HEIGHT,
                depth: depth
            }, scene);

            // Position du joueur
            if (positions[index]) {
                player.position = new Vector3(
                    positions[index].X,
                    FOUR_PLAYER_CONFIG.POSITION_Y,
                    positions[index].Z
                );
            }

            // Matériau et couleur avec nom unique
            const material = new StandardMaterial(`fourPlayer_${index}_Mat_${Date.now()}`, scene);
            
            // Convertir la couleur hex en RGB
            const hexColor = info.color;
            const r = parseInt(hexColor.slice(1, 3), 16) / 255;
            const g = parseInt(hexColor.slice(3, 5), 16) / 255;
            const b = parseInt(hexColor.slice(5, 7), 16) / 255;
            
            material.diffuseColor = new Color3(r, g, b);
            material.emissiveColor = material.diffuseColor.scale(0.5);
            material.specularColor = new Color3(0.2, 0.2, 0.2);
            
            player.material = material;
            this.players.push(player);

            console.log(`Joueur ${index} créé à la position X:${positions[index].X}, Z:${positions[index].Z} avec nom unique`);
        });
    }

    /**
     * AUCUN MUR - Mode 4 joueurs sans murs
     */
    private createBoundaryWalls(scene: Scene): void {
        // Pas de murs du tout en mode 4 joueurs
        // Les goals sont détectés par zones invisibles uniquement
    }

    /**
     * Crée les murs colorés pour chaque joueur avec collisions
     */
    private createPlayerWalls(scene: Scene): void {
        const wallConfig = FOUR_PLAYER_CONFIG.PLAYER_WALLS;
        const playerColors = [
            MAIN_COLORS.RGB_BLUE,    // Player 0 (gauche)
            MAIN_COLORS.RGB_PURPLE,  // Player 1 (droite)
            MAIN_COLORS.RGB_YELLOW,  // Player 2 (haut)
            MAIN_COLORS.RGB_GREEN    // Player 3 (bas)
        ];

        // Créer un mur pour chaque joueur
        Object.entries(wallConfig.POSITIONS).forEach(([playerKey, position], index) => {
            const isVertical = index <= 1; // Players 0 et 1 ont des murs verticaux
            
            // Dimensions du mur selon son orientation
            const width = isVertical ? wallConfig.DEPTH : wallConfig.WIDTH;
            const depth = isVertical ? wallConfig.WIDTH : wallConfig.DEPTH;
            
            const wall = MeshBuilder.CreateBox(`playerWall_${index}`, {
                width: width,
                height: wallConfig.HEIGHT,
                depth: depth
            }, scene);

            // Position du mur
            wall.position = new Vector3(position.X, 5, position.Z);

            // Matériau coloré avec effet lumineux
            const material = new StandardMaterial(`playerWallMaterial_${index}`, scene);
            material.diffuseColor = playerColors[index];
            material.emissiveColor = playerColors[index].scale(0.3); // Effet lumineux
            material.specularColor = new Color3(0.5, 0.5, 0.5);
            
            wall.material = material;
            this.walls.push(wall);

            console.log(`Mur coloré créé pour joueur ${index} à la position X:${position.X}, Z:${position.Z}`);
        });
    }

    /**
     * Configure les événements du mode 4 joueurs
     */
    private setupEventListeners(): void {
        if (!this.fourPlayerData) return;

        this.fourPlayerData.on(FourPlayerGameEvents.PLAYER_ELIMINATED, (playerId: number, playerName: string) => {
            this.eliminatePlayer(playerId);
        });

        this.fourPlayerData.on(FourPlayerGameEvents.PLAYER_WON, (winnerId: number, winnerName: string) => {
            this.handleGameWin(winnerId, winnerName);
        });

        this.fourPlayerData.on(FourPlayerGameEvents.GAME_RESET, () => {
            this.resetGame();
        });
    }

    /**
     * Élimine un joueur visuellement
     */
    private eliminatePlayer(playerId: number): void {
        if (playerId < this.players.length) {
            const player = this.players[playerId];
            
            console.log(`Élimination du joueur ${playerId} - cachage permanent`);
            
            // Cacher immédiatement le joueur pour éviter qu'il réapparaisse
            player.isVisible = false;
            player.setEnabled(false); // Désactiver complètement
            
            // Effet de désintégration de la raquette
            if (this.parentGame && this.parentGame.createPaddleDisintegrationEffect) {
                this.parentGame.createPaddleDisintegrationEffect(playerId);
            }
        }
    }

    /**
     * Gère la fin de partie
     */
    private handleGameWin(winnerId: number, winnerName: string): void {
        console.log(`Victoire de ${winnerName}!`);
        
        // Afficher un message de victoire
        if (this.parentGame && this.parentGame.showGameOverMessage) {
            // Utiliser le système existant de message de fin
            setTimeout(() => {
                this.fourPlayerData?.resetGame();
            }, 3000);
        }
    }

    /**
     * Réinitialise le jeu
     */
    private resetGame(): void {
        console.log('Reset du jeu 4 joueurs - réactivation de tous les joueurs');
        
        // Réafficher et réactiver tous les joueurs
        this.players.forEach((player, index) => {
            player.isVisible = true;
            player.setEnabled(true);
            console.log(`Joueur ${index} réactivé`);
        });

        // Supprimer les murs d'élimination
        this.eliminatedWalls.forEach(wall => {
            wall.dispose();
        });
        this.eliminatedWalls = [];

        // Réinitialiser la balle
        if (this.ballManager) {
            this.ballManager.reset();
        }

        // Redémarrer le jeu
        setTimeout(() => {
            this.fourPlayerData?.startGame();
        }, 500);
    }

    /**
     * Nettoie les ressources du mode de jeu
     */
    cleanup(): void {
        // Restaurer la position de la caméra
        if (this.scene) {
            const camera = this.scene.getCameraByName("camera");
            if (camera) {
                camera.position.y = CAMERA_CONFIG.HEIGHT; // Restaurer la position normale
            }
            
            // Restaurer la visibilité des éléments du mode 2 joueurs
            const elementsToShow = [
                "topWallPlane", "bottomWallPlane", 
                "scoreDisplay0", "scoreDisplay1",
                "playerNameDisplay0", "playerNameDisplay1"
            ];
            
            elementsToShow.forEach(elementName => {
                const element = this.scene!.getMeshByName(elementName);
                if (element) element.isVisible = true;
            });
        }

        // Nettoyer les gestionnaires
        if (this.controlsManager) {
            this.controlsManager.cleanup();
        }

        // Nettoyer les joueurs
        this.players.forEach(player => player.dispose());
        this.players = [];

        // Nettoyer les murs
        this.walls.forEach(wall => wall.dispose());
        this.walls = [];

        // Nettoyer les murs d'élimination
        this.eliminatedWalls.forEach(wall => wall.dispose());
        this.eliminatedWalls = [];

        // Nettoyer les gestionnaires
        this.ballManager = null;
        this.controlsManager = null;
        this.fourPlayerData = null;
        this.scene = null;
        this.parentGame = null;
    }

    /**
     * Retourne le type de ce mode de jeu
     */
    getType(): GameType {
        return GameType.FOUR_PLAYER_PONG;
    }
}