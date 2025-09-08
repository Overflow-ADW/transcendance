import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";
import { IPongGameMode } from "./DefaultPongMode";
import { GameType } from "@/game/utils/pongData";
import { PongBall } from "@/game/utils/pongGame";
import { PongData } from "@/game/utils/pongData";
import { PongControls } from "@/game/utils/pongControls";
import { getGameModeConfig, PLAYER_CONFIG, MAIN_COLORS } from "@/game/utils/pongValues";

/**
 * MultiplayerPongMode
 *
 * Mode de jeu multijoueur avec une paddle verte au centre.
 * - Les paddles bleue et violette (gauche/droite) sont en équipe
 * - La paddle verte (centre) est seule contre les deux autres
 * - Quand la balle touche la paddle verte, elle "explose" et les autres marquent
 * - Premier à 3 points gagne
 */
export class MultiplayerPongMode implements IPongGameMode {
    private ballManager?: PongBall;
    private gameData: PongData | null = null;
    private centerPaddle: Mesh | null = null;
    private scene: Scene | null = null;
    private controls: PongControls | null = null;
    private pongInstance: any = null;

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
        glowLayers?: any,
        topWallPlane?: Mesh,
        bottomWallPlane?: Mesh
    ): void {
        this.scene = scene;
        this.gameData = gameData;
        this.controls = controls;
        this.pongInstance = parent;

        // Modifier le score maximum pour ce mode
        gameData.setMaxScore(3);

        // Créer la paddle verte au centre
        this.createCenterPaddle(scene);

        // Obtenir la configuration pour ce mode de jeu
        const modeConfig = getGameModeConfig(GameType.MULTIPLAYER_PONG);
        
        // Configurer le gestionnaire de balle avec une logique personnalisée
        this.ballManager = new MultiplayerPongBall(
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
            parent,
            this.centerPaddle || undefined // Convertir null en undefined
        );

        // Ajouter les contrôles pour la paddle du centre (touches I/K)
        if (this.centerPaddle) {
            controls.setPlayer2(this.centerPaddle);
        }

        console.log("Mode multijoueur initialisé avec paddle centrale verte");
    }

    private createCenterPaddle(scene: Scene): void {
        // Créer la paddle verte au centre
        this.centerPaddle = MeshBuilder.CreateBox("player2", {
            width: PLAYER_CONFIG.WIDTH,
            height: PLAYER_CONFIG.HEIGHT,
            depth: PLAYER_CONFIG.DEPTH
        }, scene);

        // Matériau vert
        const centerMaterial = new StandardMaterial("centerPlayerMat", scene);
        centerMaterial.diffuseColor = MAIN_COLORS.RGB_GREEN;
        centerMaterial.emissiveColor = MAIN_COLORS.RGB_GREEN.scale(0.5);
        centerMaterial.specularColor = new Color3(0.2, 0.2, 0.2);
        this.centerPaddle.material = centerMaterial;

        // Position au centre
        this.centerPaddle.position = new Vector3(
            0, // Au centre horizontalement
            PLAYER_CONFIG.POSITION_Y,
            300 // Commencer hors écran, apparaîtra quand la balle sera lancée
        );

        // Masquer initialement
        this.centerPaddle.isVisible = false;
    }

    cleanup(): void {
        if (this.centerPaddle) {
            this.centerPaddle.dispose();
            this.centerPaddle = null;
        }
        this.ballManager = undefined;
        this.gameData = null;
        this.scene = null;
        this.controls = null;
        this.pongInstance = null;
    }

    getType(): GameType {
        return GameType.MULTIPLAYER_PONG;
    }
}

/**
 * Version personnalisée de PongBall pour le mode multijoueur
 */
class MultiplayerPongBall extends PongBall {
    private centerPaddle: Mesh | null = null;

    constructor(
        scene: Scene,
        ball: Mesh,
        player0: Mesh,
        player1: Mesh,
        topWall: Mesh,
        bottomWall: Mesh,
        gameData: PongData,
        options: any,
        glowLayers?: any,
        topWallPlane?: Mesh,
        bottomWallPlane?: Mesh,
        controls?: PongControls,
        pongInstance?: any,
        centerPaddle?: Mesh
    ) {
        super(scene, ball, player0, player1, topWall, bottomWall, gameData, options, 
              glowLayers, topWallPlane, bottomWallPlane, controls, pongInstance);
        
        this.centerPaddle = centerPaddle || null;
    }

    // Override de la méthode resetBallWithAnimation pour faire apparaître la paddle centrale
    protected resetBallWithAnimation(isGoal = false): void {
        super.resetBallWithAnimation(isGoal);
        
        // Faire apparaître la paddle centrale quand la balle est relancée
        if (this.centerPaddle && !this.centerPaddle.isVisible) {
            this.centerPaddle.isVisible = true;
            // Animation d'apparition au centre
            this.centerPaddle.position.z = 0;
        }
    }

    // Override de la méthode handlePlayerCollisions pour inclure la paddle centrale
    protected handlePlayerCollisions(): void {
        // Appeler la méthode parent pour les collisions normales
        super.handlePlayerCollisions();

        // Vérifier collision avec la paddle centrale
        if (this.centerPaddle && this.centerPaddle.isVisible) {
            this.handleCenterPaddleCollision();
        }
    }

    private handleCenterPaddleCollision(): void {
        if (!this.centerPaddle) return;

        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        const centerPos = this.centerPaddle.position;
        const paddleWidth = PLAYER_CONFIG.WIDTH;
        const paddleDepth = PLAYER_CONFIG.DEPTH;

        // Vérifier collision avec la paddle centrale
        if (Math.abs(this.ball.position.x - centerPos.x) < paddleWidth/2 + ballRadius &&
            Math.abs(this.ball.position.z - centerPos.z) < paddleDepth/2 + ballRadius) {
            
            console.log("Collision avec la paddle centrale - Player 2 éliminé!");
            
            // Créer l'effet d'explosion pour la paddle centrale
            if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                this.pongInstance.createPaddleDisintegrationEffect(2); // Index 2 pour la paddle centrale
            }

            // Masquer la paddle centrale
            this.centerPaddle.isVisible = false;

            // Les joueurs 0 et 1 (équipe) marquent un point
            // On peut décider qui des deux marque, disons player0 pour simplifier
            this.gameData.scorePlayer0();

            // Réinitialiser la balle
            this.resetBallWithAnimation(true);
        }
    }

    // Override de checkScoring pour empêcher les goals normaux en mode multijoueur
    protected checkScoring(): void {
        // En mode multijoueur, pas de goals traditionnels par les côtés
        // Le seul moyen de marquer est de toucher la paddle centrale
        // On peut garder une logique de base pour éviter que la balle sorte complètement
        
        const ballX = this.ball.position.x;
        const outOfBounds = 520; // Un peu plus large que d'habitude

        if (ballX > outOfBounds || ballX < -outOfBounds) {
            // Si la balle sort vraiment trop, on la remet en jeu
            console.log("Balle hors limites - remise en jeu");
            this.resetBallWithAnimation(false);
        }
    }
}