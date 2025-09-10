import { Scene, Mesh } from "@babylonjs/core";
import { PongBall } from "@/game/utils/pongGame";
import { PongData, GameType } from "@/game/utils/pongData";
import { PongControls } from "@/game/utils/pongControls";
import { getGameModeConfig } from "@/game/utils/pongValues";

export interface IPongGameMode {
    initialize(scene: Scene, ball: Mesh, player0: Mesh, player1: Mesh, 
               topWall: Mesh, bottomWall: Mesh, gameData: any,
               controls: any, parent: any, glowLayers?: any,
               topWallPlane?: Mesh, bottomWallPlane?: Mesh): void;
    cleanup(): void;
    getType(): GameType;
}

export class DefaultPongMode implements IPongGameMode {
    private ballManager?: PongBall;
    private gameData: PongData | null = null;

    constructor() {

    }

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
        
        const modeConfig = getGameModeConfig(GameType.DEFAULT_PONG);
        
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

    cleanup(): void {
        this.gameData = null;
        this.ballManager = undefined;
    }

    getType(): GameType {
        return GameType.DEFAULT_PONG;
    }
}
