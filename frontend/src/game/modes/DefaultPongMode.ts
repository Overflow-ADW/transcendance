import { Scene, Mesh } from "@babylonjs/core";
import { PongBall } from "@/game/utils/pongGame";
import { PongData, GameType } from "@/game/utils/pongData";
import { PongControls } from "@/game/utils/pongControls";
import { getGameModeConfig } from "@/game/utils/pongValues";

/**
 * Interface définissant un mode de jeu Pong
 */
export interface IPongGameMode {
    initialize(scene: Scene, ball: Mesh, player0: Mesh, player1: Mesh, 
               topWall: Mesh, bottomWall: Mesh, gameData: PongData,
               controls: PongControls, parent: any): void;
    cleanup(): void;
    getType(): GameType;
}

/**
 * Implémentation du mode de jeu Pong par défaut
 */
export class DefaultPongMode implements IPongGameMode {
    private ballManager?: PongBall;
    private gameData: PongData | null = null;

    constructor() {
        // Initialisation spécifique au mode par défaut
    }

    /**
     * Initialise le mode de jeu
     */
    initialize(
        scene: Scene, 
        ball: Mesh, 
        player0: Mesh, 
        player1: Mesh, 
        topWall: Mesh, 
        bottomWall: Mesh, 
        gameData: PongData,
        controls: PongControls,
        parent: any,
        glowLayers?: any,
        topWallPlane?: Mesh,
        bottomWallPlane?: Mesh
    ): void {
        this.gameData = gameData;
        
        // Obtenir la configuration pour ce mode de jeu
        const modeConfig = getGameModeConfig(GameType.DEFAULT_PONG);
        
        // Configurer le gestionnaire de balle avec les paramètres spécifiques à ce mode
        this.ballManager = new PongBall(
            scene,
            ball,
            player0,
            player1,
            topWall,
            bottomWall,
            gameData,
            { 
                initialSpeed: modeConfig.BALL_PHYSICS.INITIAL_SPEED, 
                speedIncrement: modeConfig.BALL_PHYSICS.SPEED_INCREMENT, 
                maxSpeed: modeConfig.BALL_PHYSICS.MAX_SPEED 
            },
            glowLayers,
            topWallPlane,
            bottomWallPlane,
            controls,
            parent
        );
    }

    /**
     * Nettoie les ressources du mode de jeu
     */
    cleanup(): void {
        // Nettoyage spécifique au mode
        this.gameData = null;
        this.ballManager = undefined;
    }

    /**
     * Retourne le type de ce mode de jeu
     */
    getType(): GameType {
        return GameType.DEFAULT_PONG;
    }
}
