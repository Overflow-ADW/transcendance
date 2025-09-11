import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Vector3, GlowLayer, ParticleSystem, Texture, Color4, PBRMaterial } from "@babylonjs/core";
import { IPongGameMode } from "./DefaultPongMode";
import { GameType, GameState, GameEvents } from "@/game/utils/pongData";
import { PongData } from "@/game/utils/pongData";
import { PongControls } from "@/game/utils/pongControls";
import { getGameModeConfig, PLAYER_CONFIG, MAIN_COLORS, BALL_CONFIG, WALL_CONFIG } from "@/game/utils/pongValues";
import { PongBall, BallOptions, GlowLayerOptions } from "@/game/utils/pongGame";

export class MultiplayerPongMode implements IPongGameMode {
    private ballManager?: MultiplayerPongBall;
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
        console.log("🎮 MultiplayerPongMode.initialize() - Jeu à 3 joueurs");
        
        this.scene = scene;
        this.gameData = gameData;
        this.controls = controls;
        this.pongInstance = parent;

        gameData.setMaxScore(1);
        console.log("🏆 Score maximum défini à 1 - premier point gagne");

        try {
            const multiplayerPlayers = localStorage.getItem('multiplayer-players');
            if (multiplayerPlayers) {
                const players = JSON.parse(multiplayerPlayers);
                
                if (players.length >= 2) {
                    const teamName = `${players[0].name} & ${players[1].name}`;
                    const player2Name = players.length >= 3 ? players[2].name : "Player 2";
                    
                    gameData.setPlayerNames(teamName, player2Name);
                    console.log(`🏷️ Noms définis - Team: "${teamName}", Player 2: "${player2Name}"`);
                } else {
                    gameData.setPlayerNames("Team (Player 0 & Player 1)", "Player 2");
                }
            } else {
                console.warn("Aucun joueur multijoueur trouvé dans localStorage");
                gameData.setPlayerNames("Team (Player 0 & Player 1)", "Player 2");
            }
        } catch (e) {
            console.warn('Erreur lors de la récupération des joueurs multijoueur:', e);
            gameData.setPlayerNames("Team (Player 0 & Player 1)", "Player 2");
        }

        this.createCenterPaddle(scene);

        this.createCenterPaddleGlow(scene);

        const modeConfig = getGameModeConfig(GameType.MULTIPLAYER_PONG);
        
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
            this.centerPaddle || undefined
        );

        if (this.centerPaddle) {
            controls.setPlayer2(this.centerPaddle);
        }

        setTimeout(() => {
            if (parent && parent.scorePlayer0Mesh && parent.scorePlayer1Mesh) {
                parent.positionScoresForGameMode();
                const currentScores = { player0: gameData.scorePlayer0, player1: gameData.scorePlayer1 };
                gameData.emit('SCORE_CHANGED', currentScores);
            }
        }, 100);

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

    private createCenterPaddle(scene: Scene): void {
        this.centerPaddle = MeshBuilder.CreateBox("centerPaddle", {
            width: PLAYER_CONFIG.WIDTH,
            height: PLAYER_CONFIG.HEIGHT,
            depth: PLAYER_CONFIG.DEPTH
        }, scene);

        const centerMaterial = new StandardMaterial("centerPaddleMat", scene);
        centerMaterial.diffuseColor = MAIN_COLORS.RGB_GREEN;
        centerMaterial.emissiveColor = MAIN_COLORS.RGB_GREEN.scale(0.5);
        centerMaterial.specularColor = new Color3(0.2, 0.2, 0.2);
        this.centerPaddle.material = centerMaterial;

        this.centerPaddle.position = new Vector3(
            0,
            PLAYER_CONFIG.POSITION_Y,
            PLAYER_CONFIG.INITIAL_POSITION_Z
        );

        this.centerPaddle.isVisible = false;
        this.centerPaddle.checkCollisions = false;
        this.centerPaddle.isPickable = false;
        this.centerPaddle.doNotSyncBoundingInfo = true;

        console.log("Paddle verte créée au centre (invisible, aucune collision automatique)");
    }

    private createCenterPaddleGlow(scene: Scene): void {
        if (!this.centerPaddle || !this.pongInstance) return;

        if (this.pongInstance.player2GlowLayer) {
            this.pongInstance.player2GlowLayer.addIncludedOnlyMesh(this.centerPaddle);
            console.log("Paddle centrale connectée au glow layer Player2");
        }
    }
}

class MultiplayerPongBall extends PongBall {
    private centerPaddle: Mesh | null = null;
    private centerPaddleAppeared = false;
    private lastGoalTime = 0;
    private lastCollisionTime = 0;
    private ballLaunchTime = 0;
    private centerPaddleHit = false;

    private centerPaddleBaseDepth = PLAYER_CONFIG.DEPTH;
    private centerPaddleCurrentDepth = PLAYER_CONFIG.DEPTH;
    private centerPaddleGrowthRate = 2;
    private lastVelocitySetTime = 0;

    constructor(
        scene: Scene,
        ball: Mesh,
        player0: Mesh,
        player1: Mesh,
        topWall: Mesh,
        bottomWall: Mesh,
        gameData: PongData,
        options: BallOptions,
        glowLayers?: GlowLayerOptions,
        topWallPlane?: Mesh,
        bottomWallPlane?: Mesh,
        controls?: PongControls,
        pongInstance?: any,
        centerPaddle?: Mesh
    ) {
        super(
            scene,
            ball,
            player0,
            player1,
            topWall,
            bottomWall,
            gameData,
            options,
            glowLayers,
            topWallPlane,
            bottomWallPlane,
            controls,
            pongInstance
        );

        this.centerPaddle = centerPaddle || null;
        this.setupMultiplayerEventListeners();

        this.disableAllAutomaticCollisions();

        console.log("✅ MultiplayerPongBall créé - Collisions automatiques complètement désactivées");
    }

    private setupMultiplayerEventListeners(): void {
        this.gameData.on(GameEvents.SCORE_CHANGED, () => {
            console.log("📊 Score changé - reset paddle centrale");
            this.centerPaddleAppeared = false;
            this.centerPaddleHit = false;
            
            this.resetCenterPaddleSize();
            
            if (this.centerPaddle) {
                this.centerPaddle.isVisible = false;
            }
            this.lastGoalTime = performance.now();
        });
    }

    protected setInitialVelocity(): void {
        const currentTime = performance.now();
        if (this.lastVelocitySetTime && (currentTime - this.lastVelocitySetTime) < 500) {
            return;
        }
        
        if (this.isResetting) {
            return;
        }
        
        this.lastVelocitySetTime = currentTime;
        this.velocityAlreadySet = true;
        
        const maxAngle = Math.PI / 12;
        const randomAngle = (Math.random() * 2 - 1) * maxAngle;
        
        let directionX = Math.random() > 0.5 ? 1 : -1;
        if (this.lastScoredPlayer === 0) {
            directionX = 1;
        } else if (this.lastScoredPlayer === 1) {
            directionX = -1;
        }
        
        this.velocity = new Vector3(
            directionX * this.options.initialSpeed,
            0,
            this.options.initialSpeed * Math.sin(randomAngle) * 0.3
        );
        
        console.log(`🎯 Vélocité définie: X=${this.velocity.x.toFixed(2)}, Z=${this.velocity.z.toFixed(2)}, Speed=${this.velocity.length().toFixed(2)}`);
        
        this.ballLaunchTime = performance.now();
        this.centerPaddleHit = false;
        
        this.updateBallColor();
        
        if (this.controls && this.controls.ai && this.controls.ai.isAIActive()) {
            setTimeout(() => {
                const ballPos = this.ball.position.clone();
                const ballVel = this.velocity.clone();
                
                if (ballVel.x > 0) {
                    this.controls!.ai!.notifyGameStart(ballPos, ballVel);
                }
            }, 16);
        }
    }

    protected resetBallWithAnimation(isGoal = false): void {
        if (this.gameData.gameState === GameState.GAME_OVER) {
            return;
        }
        
        this.velocityAlreadySet = false;
        this.lastVelocitySetTime = 0;
        
        this.resetAllGlows();
        
        if (this.centerPaddle) {
            this.centerPaddle.isVisible = false;
        }
        
        this.centerPaddleAppeared = false;
        this.centerPaddleHit = false;
        this.lastGoalTime = performance.now();
        this.lastCollisionTime = 0;
        this.ballLaunchTime = 0;
        
        this.player0.position = new Vector3(
            PLAYER_CONFIG.PLAYER0_POSITION_X,
            PLAYER_CONFIG.POSITION_Y,
            PLAYER_CONFIG.INITIAL_POSITION_Z
        );
        
        this.player1.position = new Vector3(
            PLAYER_CONFIG.PLAYER1_POSITION_X,
            PLAYER_CONFIG.POSITION_Y,
            PLAYER_CONFIG.INITIAL_POSITION_Z
        );
        
        if (this.centerPaddle) {
            this.centerPaddle.position = new Vector3(
                0,
                PLAYER_CONFIG.POSITION_Y,
                PLAYER_CONFIG.INITIAL_POSITION_Z
            );
        }
        
        this.isResetting = true;
        
        if (this.controls) {
            this.controls.setControlsLocked(true);
        }
        const targetPosition = new Vector3(
            BALL_CONFIG.INITIAL_POSITION.X, 
            BALL_CONFIG.INITIAL_POSITION.Y, 
            BALL_CONFIG.INITIAL_POSITION.Z
        );
        this.ball.position = targetPosition;
        
        this.ballMaterial.albedoColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveIntensity = 2.0;
        
        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 1.0;
        }
        
        if (isGoal) {
            setTimeout(() => {
                this.createTronSpawnEffect();
                
                setTimeout(() => {
                    this.setInitialVelocity();
                    this.isResetting = false;

                    if (this.controls) {
                        this.controls.setControlsLocked(false);
                    }
                }, 1500);
            }, 500);
        } else {
            setTimeout(() => {
                this.createTronSpawnEffect();
                
                setTimeout(() => {
                    this.setInitialVelocity();
                    this.isResetting = false;
                    
                    if (this.controls) {
                        this.controls.setControlsLocked(false);
                    }
                }, 800);
            }, 200);
        }
    }

    protected update(): void {
        if (this.isResetting) return;

        if (this.ballLaunchTime === 0 && this.velocity.length() > 0.1 && this.ball.isVisible) {
            this.ballLaunchTime = performance.now();
        }
        
        super.update();

        if (!this.isResetting && this.ball.isVisible) {
            this.handleCenterPaddleLogic();
        }
        
        if (!this.isResetting && this.ball.isVisible && !this.centerPaddleHit) {
            this.handleCenterPaddleCollision();
        }
    }

    private handlePlayerCollisionsWithoutScoring(): void {
        if (this.centerPaddleHit) return;
        
        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        const ballPos = this.ball.position;
        
        const player0Pos = this.player0.position;
        const player1Pos = this.player1.position;
        
        const paddleHalfWidth = PLAYER_CONFIG.WIDTH / 2;
        const paddleHalfHeight = PLAYER_CONFIG.HEIGHT / 2;
        const paddleHalfDepth = PLAYER_CONFIG.DEPTH / 2;

        if (Math.abs(ballPos.x - player0Pos.x) <= paddleHalfWidth + ballRadius &&
            Math.abs(ballPos.y - player0Pos.y) <= paddleHalfHeight + ballRadius &&
            Math.abs(ballPos.z - player0Pos.z) <= paddleHalfDepth + ballRadius &&
            this.velocity.x < 0) {
            this.velocity.x = Math.abs(this.velocity.x);
            this.ball.position.x = player0Pos.x + paddleHalfWidth + ballRadius + 1;
            
            if (this.centerPaddle && this.centerPaddleAppeared) {
                this.growCenterPaddle();
            }
        }
        
        if (Math.abs(ballPos.x - player1Pos.x) <= paddleHalfWidth + ballRadius &&
            Math.abs(ballPos.y - player1Pos.y) <= paddleHalfHeight + ballRadius &&
            Math.abs(ballPos.z - player1Pos.z) <= paddleHalfDepth + ballRadius &&
            this.velocity.x > 0) {
            this.velocity.x = -Math.abs(this.velocity.x);
            
            this.ball.position.x = player1Pos.x - paddleHalfWidth - ballRadius - 1;
            
            if (this.centerPaddle && this.centerPaddleAppeared) {
                this.growCenterPaddle();
            }
        }
    }

    private growCenterPaddle(): void {
        if (!this.centerPaddle) return;
        
        this.centerPaddleCurrentDepth += this.centerPaddleGrowthRate;
        
        const newPaddleGeometry = MeshBuilder.CreateBox("centerPaddleNew", {
            width: PLAYER_CONFIG.WIDTH,
            height: PLAYER_CONFIG.HEIGHT,
            depth: this.centerPaddleCurrentDepth
        }, this.scene);
        
        newPaddleGeometry.position = this.centerPaddle.position.clone();
        newPaddleGeometry.material = this.centerPaddle.material;
        newPaddleGeometry.isVisible = this.centerPaddle.isVisible;
        newPaddleGeometry.checkCollisions = false;
        newPaddleGeometry.isPickable = false;
        newPaddleGeometry.doNotSyncBoundingInfo = true;

        const oldPaddle = this.centerPaddle;
        this.centerPaddle = newPaddleGeometry;
        
        oldPaddle.dispose();
        
        if (this.controls && this.controls.hasPlayer2()) {
            this.controls.setPlayer2(this.centerPaddle);
        }
        
        this.createCenterPaddleGrowthEffect();
    }
    
    private resetCenterPaddleSize(): void {
        if (!this.centerPaddle) return;
        this.centerPaddleCurrentDepth = this.centerPaddleBaseDepth;
        const resetPaddleGeometry = MeshBuilder.CreateBox("centerPaddleReset", {
            width: PLAYER_CONFIG.WIDTH,
            height: PLAYER_CONFIG.HEIGHT,
            depth: this.centerPaddleBaseDepth
        }, this.scene);
        
        resetPaddleGeometry.position = this.centerPaddle.position.clone();
        resetPaddleGeometry.material = this.centerPaddle.material;
        resetPaddleGeometry.isVisible = false;
        resetPaddleGeometry.checkCollisions = false;
        resetPaddleGeometry.isPickable = false;
        resetPaddleGeometry.doNotSyncBoundingInfo = true;

        const oldPaddle = this.centerPaddle;
        this.centerPaddle = resetPaddleGeometry;
    }
    
    private createCenterPaddleGrowthEffect(): void {
        if (!this.centerPaddle) return;

        const growthParticles = new ParticleSystem("centerPaddleGrowth", 40, this.scene);
        
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        growthParticles.particleTexture = particleTexture;
        
        growthParticles.emitter = this.centerPaddle.position.clone();
        
        growthParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH/2, -PLAYER_CONFIG.HEIGHT/2, -this.centerPaddleCurrentDepth/2);
        growthParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH/2, PLAYER_CONFIG.HEIGHT/2, this.centerPaddleCurrentDepth/2);
        
        growthParticles.color1 = new Color4(
            Math.min(1, MAIN_COLORS.RGB_GREEN.r * 2.0),
            Math.min(1, MAIN_COLORS.RGB_GREEN.g * 2.0),
            Math.min(1, MAIN_COLORS.RGB_GREEN.b * 2.0),
            1.0
        );
        growthParticles.color2 = new Color4(0.5, 1, 0.5, 1.0);
        growthParticles.colorDead = new Color4(MAIN_COLORS.RGB_GREEN.r, MAIN_COLORS.RGB_GREEN.g, MAIN_COLORS.RGB_GREEN.b, 0);

        growthParticles.minSize = 0.2;
        growthParticles.maxSize = 0.8;
        growthParticles.minLifeTime = 0.3;
        growthParticles.maxLifeTime = 0.6;
        growthParticles.minEmitPower = 1;
        growthParticles.maxEmitPower = 3;

        growthParticles.createSphereEmitter(0.5);
        growthParticles.emitRate = 0;
        growthParticles.manualEmitCount = 30;
        growthParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        growthParticles.gravity = new Vector3(0, 0, 0);

        growthParticles.start();

        const material = this.centerPaddle.material as StandardMaterial;
        if (material) {
            const originalEmissive = material.emissiveColor.clone();
            material.emissiveColor = new Color3(0, 3, 0);
            
            setTimeout(() => {
                material.emissiveColor = originalEmissive;
            }, 300);
        }

        setTimeout(() => {
            growthParticles.stop();
            setTimeout(() => {
                growthParticles.dispose();
            }, 600);
        }, 150);
    }

    private resetAllGlows(): void {
        if (this.player0GlowLayer && this.player0.material instanceof StandardMaterial) {
            this.player0GlowLayer.intensity = 0.8;
            this.player0.material.emissiveColor = MAIN_COLORS.RGB_BLUE.scale(0.5);
        }
        
        if (this.player1GlowLayer && this.player1.material instanceof StandardMaterial) {
            this.player1GlowLayer.intensity = 0.8;
            this.player1.material.emissiveColor = MAIN_COLORS.RGB_PURPLE.scale(0.5);
        }
        
        if (this.topWallGlowLayer) {
            this.topWallGlowLayer.intensity = 0.8;
        }
        
        if (this.bottomWallGlowLayer) {
            this.bottomWallGlowLayer.intensity = 0.8;
        }
        if (this.centerPaddle && this.centerPaddle.material instanceof StandardMaterial) {
            this.centerPaddle.material.emissiveColor = MAIN_COLORS.RGB_GREEN.scale(0.5);
        }
    }

    private handleCenterPaddleLogic(): void {
        if (!this.centerPaddleAppeared && !this.isResetting && this.centerPaddle) {
            const currentTime = performance.now();
            const timeSinceBallLaunch = currentTime - this.ballLaunchTime;
            const velocityLength = this.velocity.length();

            const hasValidVelocity = velocityLength > 0.1;
            const hasValidLaunchTime = this.ballLaunchTime > 0 && timeSinceBallLaunch > 100;
            const ballIsMoving = this.ball.isVisible && !this.isResetting;
            
            if (ballIsMoving && (hasValidVelocity || hasValidLaunchTime || timeSinceBallLaunch > 500)) {
                this.makeCenterPaddleAppear();
            }
        }
    }

    private makeCenterPaddleAppear(): void {
        if (!this.centerPaddle || this.centerPaddleAppeared) return;
        
        this.centerPaddleAppeared = true;
        
        this.centerPaddle.isVisible = true;
        
        this.createCenterPaddleAppearanceEffect();

        this.centerPaddle.scaling = new Vector3(0.1, 0.1, 0.1);
        
        const startTime = performance.now();
        const animationDuration = 600;
        
        const animateAppearance = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            
            if (progress < 1) {
                const easeProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                const scale = 0.1 + (0.9 * easeProgress);
                this.centerPaddle!.scaling = new Vector3(scale, scale, scale);
                requestAnimationFrame(animateAppearance);
            } else {
                this.centerPaddle!.scaling = new Vector3(1, 1, 1);
            }
        };
        
        requestAnimationFrame(animateAppearance);
    }

    private handleCenterPaddleCollision(): void {
        if (!this.centerPaddle || !this.centerPaddle.isVisible || this.isResetting || this.centerPaddleHit) {
            return;
        }
        
        const currentTime = performance.now();
        if (currentTime - this.lastCollisionTime < 100) return;
        
        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        const centerPos = this.centerPaddle.position;
        const paddleHalfWidth = PLAYER_CONFIG.WIDTH / 2;
        const paddleHalfDepth = this.centerPaddleCurrentDepth / 2;
        const paddleHalfHeight = PLAYER_CONFIG.HEIGHT / 2;

        if (Math.abs(this.ball.position.x - centerPos.x) <= paddleHalfWidth + ballRadius &&
            Math.abs(this.ball.position.z - centerPos.z) <= paddleHalfDepth + ballRadius &&
            Math.abs(this.ball.position.y - centerPos.y) <= paddleHalfHeight + ballRadius) {
            
            console.log("💥 COLLISION AVEC PADDLE CENTRALE ! La Team gagne immédiatement !");
            
            this.centerPaddleHit = true;
            this.isResetting = true;
            this.lastCollisionTime = currentTime;
            
            this.gameData.scorePlayer0();
            this.lastScoredPlayer = 0;
            
            console.log("Team a marqué! Collision réussie avec Player 2");
            
            this.createCenterPaddleHitEffect();
            
            this.velocity.x *= -1;
            this.velocity.z *= -0.8;
            
            if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                this.pongInstance.createPaddleDisintegrationEffect(2);
            }
            
            setTimeout(() => {
                this.resetBallWithAnimation(true);
            }, 500);
        }
    }

    private createCenterPaddleAppearanceEffect(): void {
        if (!this.centerPaddle) return;

        const appearanceParticles = new ParticleSystem("centerPaddleAppearance", 80, this.scene);
        
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        appearanceParticles.particleTexture = particleTexture;
        
        appearanceParticles.emitter = this.centerPaddle.position.clone();
        
        appearanceParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH/2, -PLAYER_CONFIG.HEIGHT/2, -PLAYER_CONFIG.DEPTH/2);
        appearanceParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH/2, PLAYER_CONFIG.HEIGHT/2, PLAYER_CONFIG.DEPTH/2);
        
        appearanceParticles.color1 = new Color4(
            Math.min(1, MAIN_COLORS.RGB_GREEN.r * 3.0),
            Math.min(1, MAIN_COLORS.RGB_GREEN.g * 3.0),
            Math.min(1, MAIN_COLORS.RGB_GREEN.b * 3.0),
            1.0
        );
        appearanceParticles.color2 = new Color4(1, 1, 1, 1.0);
        appearanceParticles.colorDead = new Color4(MAIN_COLORS.RGB_GREEN.r, MAIN_COLORS.RGB_GREEN.g, MAIN_COLORS.RGB_GREEN.b, 0);

        appearanceParticles.minSize = 0.3;
        appearanceParticles.maxSize = 1.0;
        appearanceParticles.minLifeTime = 0.5;
        appearanceParticles.maxLifeTime = 1.0;
        appearanceParticles.minEmitPower = 2;
        appearanceParticles.maxEmitPower = 5;

        appearanceParticles.createSphereEmitter(1.0);
        appearanceParticles.emitRate = 0;
        appearanceParticles.manualEmitCount = 60;
        appearanceParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        appearanceParticles.gravity = new Vector3(0, -1, 0);

        appearanceParticles.start();

        setTimeout(() => {
            appearanceParticles.stop();
            setTimeout(() => {
                appearanceParticles.dispose();
            }, 1000);
        }, 200);
    }

    private createCenterPaddleHitEffect(): void {
        if (!this.centerPaddle) return;

        const hitParticles = new ParticleSystem("centerPaddleHit", 60, this.scene);
        
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        hitParticles.particleTexture = particleTexture;
        
        hitParticles.emitter = this.centerPaddle.position.clone();
        hitParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH/2, -PLAYER_CONFIG.HEIGHT/2, -PLAYER_CONFIG.DEPTH/2);
        hitParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH/2, PLAYER_CONFIG.HEIGHT/2, PLAYER_CONFIG.DEPTH/2);
        
        hitParticles.color1 = new Color4(
            Math.min(1, MAIN_COLORS.RGB_GREEN.r * 4.0),
            Math.min(1, MAIN_COLORS.RGB_GREEN.g * 4.0),
            Math.min(1, MAIN_COLORS.RGB_GREEN.b * 4.0),
            1.0
        );
        hitParticles.color2 = new Color4(1, 1, 0, 1.0);
        hitParticles.colorDead = new Color4(MAIN_COLORS.RGB_GREEN.r, MAIN_COLORS.RGB_GREEN.g, MAIN_COLORS.RGB_GREEN.b, 0);
        
        hitParticles.minSize = 0.5;
        hitParticles.maxSize = 1.5;
        hitParticles.minLifeTime = 0.4;
        hitParticles.maxLifeTime = 0.8;
        hitParticles.minEmitPower = 5;
        hitParticles.maxEmitPower = 10;
        
        hitParticles.createSphereEmitter(1.5);
        hitParticles.emitRate = 0;
        hitParticles.manualEmitCount = 60;
        hitParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        hitParticles.gravity = new Vector3(0, -3, 0);
        
        const originalMaterial = this.centerPaddle.material as StandardMaterial;
        const originalEmissive = originalMaterial.emissiveColor.clone();
        originalMaterial.emissiveColor = new Color3(1, 1, 1);
        
        setTimeout(() => {
            originalMaterial.emissiveColor = originalEmissive;
        }, 200);
        
        hitParticles.start();
        
        setTimeout(() => {
            hitParticles.stop();
            setTimeout(() => {
                hitParticles.dispose();
            }, 800);
        }, 100);
    }

    private logVelocityChange(location: string): void {
        const speed = this.velocity.length();
        console.log(`🔍 [${location}] Vélocité: X=${this.velocity.x.toFixed(2)}, Z=${this.velocity.z.toFixed(2)}, Speed=${speed.toFixed(2)}`);
    }

    private disableAllAutomaticCollisions(): void {
        const gameElements = [this.ball, this.player0, this.player1, this.topWall, this.bottomWall];
        
        if (this.centerPaddle) {
            gameElements.push(this.centerPaddle);
        }
        
        gameElements.forEach(element => {
            if (element) {
                element.checkCollisions = false;
                element.isPickable = false;
                element.doNotSyncBoundingInfo = true;
            }
        });
        
        this.scene.meshes.forEach((mesh: any) => {
            if (!gameElements.includes(mesh)) {
                mesh.checkCollisions = false;
                mesh.isPickable = false;
                if (mesh.name.includes('scoreDisplay') || 
                    mesh.name.includes('gameOver') ||
                    mesh.name.includes('Plane') ||
                    mesh.name.includes('Text') ||
                    mesh.name.includes('Line') ||
                    mesh.name.includes('wall') ||
                    mesh.name.includes('particle')) {
                    
                    mesh.doNotSyncBoundingInfo = true;
                }
            }
        });
        
        this.scene.collisionsEnabled = false;
        this.scene.gravity = new Vector3(0, 0, 0);
        
        const originalIntersectsMesh = this.ball.intersectsMesh;
        this.ball.intersectsMesh = () => false;
        
        console.log("✅ TOUTES les collisions automatiques désactivées (système global)");

        this.startTemporaryElementsCleanup();
    }
    
    private startTemporaryElementsCleanup(): void {
        const cleanupInterval = setInterval(() => {
            if (this.scene && !this.scene.isDisposed) {
                this.scene.meshes.forEach((mesh: any) => {
                    if ((mesh.name.includes('particle') || 
                         mesh.name.includes('Line') || 
                         mesh.name.includes('Trail')) && 
                        mesh.metadata?.isTemporary) {
                        
                        try {
                            mesh.dispose();
                            console.log(`🧹 Élément temporaire nettoyé: ${mesh.name}`);
                        } catch (error) {
                            console.warn(`Erreur lors du nettoyage de ${mesh.name}:`, error);
                        }
                    }
                });
            } else {
                clearInterval(cleanupInterval);
            }
        }, 5000);
    }

    protected handleWallCollisions(): void {
        const topWallZ = this.topWall.position.z;
        const bottomWallZ = this.bottomWall.position.z;
        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        const wallCollisionThreshold = BALL_CONFIG.COLLISION_THRESHOLD;
        
        if (this.ball.position.z + ballRadius >= topWallZ - wallCollisionThreshold && this.velocity.z > 0) {
            this.velocity.z = -this.velocity.z;
            this.ball.position.z = topWallZ - ballRadius - wallCollisionThreshold;
        }
        
        if (this.ball.position.z - ballRadius <= bottomWallZ + wallCollisionThreshold && this.velocity.z < 0) {
            this.velocity.z = -this.velocity.z;
            this.ball.position.z = bottomWallZ + ballRadius + wallCollisionThreshold;
        }
    }
}