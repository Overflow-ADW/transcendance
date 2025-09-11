import { Scene, Tools, Mesh, Vector3, PBRMaterial, Color3, GlowLayer, Animation, EasingFunction, CircleEase, StandardMaterial, ParticleSystem, Texture, Color4, MeshBuilder, Quaternion } from "@babylonjs/core";
import { GameState, GameEvents } from "@/game/utils/pongData";
import { BALL_CONFIG, PLAYER_CONFIG, MAIN_COLORS, CAMERA_CONFIG, GAME_CONFIG } from "@/game/utils/pongValues";
import { PongData, GameType } from "@/game/utils/pongData";
import { PongControls } from "@/game/utils/pongControls";

export interface BallOptions {
    initialSpeed: number;
    speedIncrement: number;
    maxSpeed: number;
}

export interface GlowLayerOptions {
    ballGlowLayer?: GlowLayer;
    topWallGlowLayer?: GlowLayer;
    bottomWallGlowLayer?: GlowLayer;
    player0GlowLayer?: GlowLayer;
    player1GlowLayer?: GlowLayer;
}

export class PongBall {
    protected ball: Mesh;
    protected player0: Mesh;
    protected player1: Mesh;
    protected velocity: Vector3 = new Vector3(0, 0, 0);
    protected options: BallOptions;
    protected topWall: Mesh;
    protected bottomWall: Mesh;
    private wallCollisionThreshold = BALL_CONFIG.COLLISION_THRESHOLD;
    protected gameData: PongData;
    protected lastScoredPlayer = -1;
    protected ballMaterial: PBRMaterial;
    protected isResetting = false;
    protected velocityAlreadySet = false;
    private goalDelayMs = 1000;
    private wallGlowAnimationDuration = 300;
    private isTopWallGlowing = false;
    private isBottomWallGlowing = false;
    private topWallPlane: Mesh | null = null;
    private bottomWallPlane: Mesh | null = null;
    private spawnParticleSystem: ParticleSystem | null = null;
    protected ballGlowLayer?: GlowLayer;
    protected topWallGlowLayer?: GlowLayer;
    protected bottomWallGlowLayer?: GlowLayer;
    private gameOverDelayMs = 3000;
    protected player0GlowLayer?: GlowLayer;
    protected player1GlowLayer?: GlowLayer;
    private isPlayer0Glowing = false;
    private isPlayer1Glowing = false;
    private playerGlowAnimationDuration = 300;
    protected controls: PongControls | null = null;
    private particleReductionFactor = GAME_CONFIG.OPTIMIZATION.PARTICLE_REDUCTION_FACTOR;
    protected pongInstance?: any;

    constructor(
        protected scene: Scene,
        ball: Mesh,
        player0: Mesh,
        player1: Mesh,
        topWall: Mesh,
        bottomWall: Mesh,
        gameData: PongData,
        options: BallOptions = { 
            initialSpeed: BALL_CONFIG.PHYSICS.INITIAL_SPEED, 
            speedIncrement: BALL_CONFIG.PHYSICS.SPEED_INCREMENT, 
            maxSpeed: BALL_CONFIG.PHYSICS.MAX_SPEED 
        },
        glowLayers?: GlowLayerOptions,
        topWallPlane?: Mesh,
        bottomWallPlane?: Mesh,
        controls?: PongControls,
        pongInstance?: any
    ) {
        this.ball = ball;
        this.player0 = player0;
        this.player1 = player1;
        this.topWall = topWall;
        this.bottomWall = bottomWall;
        this.options = options;
        this.gameData = gameData;
        this.topWallPlane = topWallPlane || null;
        this.bottomWallPlane = bottomWallPlane || null;
        this.ballGlowLayer = glowLayers?.ballGlowLayer;
        this.topWallGlowLayer = glowLayers?.topWallGlowLayer;
        this.bottomWallGlowLayer = glowLayers?.bottomWallGlowLayer;
        this.player0GlowLayer = glowLayers?.player0GlowLayer;
        this.player1GlowLayer = glowLayers?.player1GlowLayer;
        this.controls = controls || null;
        this.pongInstance = pongInstance;

        this.ballMaterial = new PBRMaterial("ballMaterial", this.scene);
        this.setupBallMaterial();
        this.ball.material = this.ballMaterial;

        this.setupSpawnParticleSystem();
 
        this.ball.isVisible = false;
        this.isResetting = true;

        this.scene.registerBeforeRender(() => this.update());

        this.setupGameEventListeners();
    }
    
    private setupGameEventListeners(): void {
        this.gameData.on(GameEvents.PLAYER_WON, () => {
            this.isResetting = true;
            this.ball.isVisible = false;
            if (this.controls) {
                this.controls.setControlsLocked(true);
            }
        });
        
        let initialStartDone = false;

        this.gameData.on(GameEvents.GAME_STATE_CHANGED, (state: GameState) => {
            if (state === GameState.PLAYING) {
            if (!initialStartDone) {
                initialStartDone = true;
                setTimeout(() => {
                this.resetBallWithAnimation();
                }, 500);
            }
            else if (this.isResetting) {
                setTimeout(() => {
                this.resetBallWithAnimation();
                }, 1500);
            }
            }
        });
    }
    
    private setupBallMaterial(): void {
        this.ballMaterial.metallic = 0.1;
        this.ballMaterial.roughness = 0;
        this.ballMaterial.albedoColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveIntensity = 2.0;
        this.ballMaterial.ambientColor = MAIN_COLORS.RGB_BLUE.scale(0.5);

        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 1.0;
        }
    }
    
    private setupSpawnParticleSystem(): void {
        const particleCount = Math.floor(200 * this.particleReductionFactor);
        this.spawnParticleSystem = new ParticleSystem("spawnParticles", particleCount, this.scene);
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        this.spawnParticleSystem.particleTexture = particleTexture;

        this.spawnParticleSystem.emitter = this.ball;
        this.spawnParticleSystem.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
        this.spawnParticleSystem.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
        this.spawnParticleSystem.color1 = new Color4(
            MAIN_COLORS.RGB_BLUE.r, 
            MAIN_COLORS.RGB_BLUE.g, 
            MAIN_COLORS.RGB_BLUE.b, 
            1.0
        );
        this.spawnParticleSystem.color2 = new Color4(
            MAIN_COLORS.RGB_PURPLE.r,
            MAIN_COLORS.RGB_PURPLE.g,
            MAIN_COLORS.RGB_PURPLE.b,
            1.0
        );
        this.spawnParticleSystem.colorDead = new Color4(0, 0, 0.8, 0);

        this.spawnParticleSystem.minSize = 0.15;
        this.spawnParticleSystem.maxSize = 0.4;

        this.spawnParticleSystem.minLifeTime = 0.25;
        this.spawnParticleSystem.maxLifeTime = 0.5;

        const emitRate = Math.floor(200 * this.particleReductionFactor);
        const manualEmitCount = Math.floor(300 * this.particleReductionFactor);
        
        this.spawnParticleSystem.emitRate = emitRate;
        this.spawnParticleSystem.manualEmitCount = manualEmitCount;
        this.spawnParticleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

        this.spawnParticleSystem.minEmitPower = 4;
        this.spawnParticleSystem.maxEmitPower = 8;

        this.spawnParticleSystem.createSphereEmitter(1.5);

        this.spawnParticleSystem.stop();
    }

    protected resetBallWithAnimation(isGoal = false): void {
        if (this.gameData.gameState === GameState.GAME_OVER) {
            return;
        }
        this.isResetting = true;

        this.velocityAlreadySet = false;

        if (this.controls) {
            this.controls.setControlsLocked(true);
        }
        this.animatePaddlesToCenter();

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
                    if (!this.velocityAlreadySet) {
                        this.setInitialVelocity();
                        this.velocityAlreadySet = true;
                    } else {
                        console.log("setInitialVelocity correctement ignoré");
                    }
                    this.isResetting = false;
                    if (this.controls) {
                        this.controls.setControlsLocked(false);
                    }
                }, this.goalDelayMs);
            }, 200);
        } else {
            setTimeout(() => {
                this.createTronSpawnEffect();
                setTimeout(() => {
                    if (!this.velocityAlreadySet) {
                        this.setInitialVelocity();
                        this.velocityAlreadySet = true;
                    } else {
                        console.log("setInitialVelocity correctement ignoré");
                    }
                    this.isResetting = false;
                    if (this.controls) {
                        this.controls.setControlsLocked(false);
                    }
                }, 500);
            }, 100);
        }
    }

    private animatePaddlesToCenter(): void {
        const player0CurrentPos = this.player0.position.clone();
        const player1CurrentPos = this.player1.position.clone();
        const player0TargetPos = new Vector3(
            PLAYER_CONFIG.PLAYER0_POSITION_X,
            PLAYER_CONFIG.POSITION_Y,
            PLAYER_CONFIG.INITIAL_POSITION_Z
        );
        
        const player1TargetPos = new Vector3(
            PLAYER_CONFIG.PLAYER1_POSITION_X,
            PLAYER_CONFIG.POSITION_Y,
            PLAYER_CONFIG.INITIAL_POSITION_Z
        );
        const distanceThreshold = 5;
        
        const player0HasMoved = Math.abs(player0CurrentPos.z - player0TargetPos.z) > distanceThreshold;
        const player1HasMoved = Math.abs(player1CurrentPos.z - player1TargetPos.z) > distanceThreshold;

        if (!player0HasMoved && !player1HasMoved) {
            console.log("Aucune raquette n'a bougé suffisamment - pas d'animation");
            this.player0.position = player0TargetPos;
            this.player1.position = player1TargetPos;
            return;
        }

        let targetPaddle: Mesh | "both" | null = null;
        let targetCurrentPos: Vector3 | null = null;
        let targetFinalPos: Vector3 | null = null;
        let targetColor: Color3 | null = null;

        if (this.lastScoredPlayer >= 0) {
            const losingPlayerIndex = this.lastScoredPlayer === 0 ? 1 : 0;
            
            if (losingPlayerIndex === 0 && player0HasMoved) {
                targetPaddle = this.player0;
                targetCurrentPos = player0CurrentPos;
                targetFinalPos = player0TargetPos;
                targetColor = MAIN_COLORS.RGB_BLUE;

                this.player1.position = player1TargetPos;
            } else if (losingPlayerIndex === 1 && player1HasMoved) {
                targetPaddle = this.player1;
                targetCurrentPos = player1CurrentPos;
                targetFinalPos = player1TargetPos;
                targetColor = MAIN_COLORS.RGB_PURPLE;

                this.player0.position = player0TargetPos;
            }
        } else {
            if (player0HasMoved && player1HasMoved) {
                this.createPaddleTrailEffect(this.player0, player0CurrentPos, player0TargetPos, MAIN_COLORS.RGB_BLUE);
                this.createPaddleTrailEffect(this.player1, player1CurrentPos, player1TargetPos, MAIN_COLORS.RGB_PURPLE);
                targetPaddle = "both";
            } else if (player0HasMoved) {
                targetPaddle = this.player0;
                targetCurrentPos = player0CurrentPos;
                targetFinalPos = player0TargetPos;
                targetColor = MAIN_COLORS.RGB_BLUE;
                this.player1.position = player1TargetPos;
            } else if (player1HasMoved) {
                targetPaddle = this.player1;
                targetCurrentPos = player1CurrentPos;
                targetFinalPos = player1TargetPos;
                targetColor = MAIN_COLORS.RGB_PURPLE;
                this.player0.position = player0TargetPos;
            }
        }

        if (!targetPaddle) {
            this.player0.position = player0TargetPos;
            this.player1.position = player1TargetPos;
            return;
        }

        if (targetPaddle !== "both" && targetCurrentPos && targetFinalPos && targetColor) {
            console.log(`Animation pour la raquette ${targetPaddle === this.player0 ? '0' : '1'} seulement`);
            this.createPaddleTrailEffect(targetPaddle, targetCurrentPos, targetFinalPos, targetColor);
        }
        
        const animationDuration = 600;
        const startTime = performance.now();

        const easeOutBack = (t: number): number => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        };
        
        const animatePaddles = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            
            if (progress < 1) {
                const easedProgress = easeOutBack(progress);

                if (targetPaddle === "both") {
                    this.player0.position = Vector3.Lerp(player0CurrentPos, player0TargetPos, easedProgress);
                    this.player1.position = Vector3.Lerp(player1CurrentPos, player1TargetPos, easedProgress);
                } else if (targetPaddle === this.player0 && targetCurrentPos && targetFinalPos) {
                    this.player0.position = Vector3.Lerp(targetCurrentPos, targetFinalPos, easedProgress);
                } else if (targetPaddle === this.player1 && targetCurrentPos && targetFinalPos) {
                    this.player1.position = Vector3.Lerp(targetCurrentPos, targetFinalPos, easedProgress);
                }
                
                requestAnimationFrame(animatePaddles);
            } else {
                this.player0.position = player0TargetPos;
                this.player1.position = player1TargetPos;

                if (targetPaddle === "both") {
                    this.createPaddleArrivalEffect();
                } else if (targetPaddle === this.player0) {
                    this.flashPaddleOnArrival(this.player0, 0);
                    this.createCenterImpactParticles(this.player0, MAIN_COLORS.RGB_BLUE);
                } else if (targetPaddle === this.player1) {
                    this.flashPaddleOnArrival(this.player1, 1);
                    this.createCenterImpactParticles(this.player1, MAIN_COLORS.RGB_PURPLE);
                }
            }
        };
        
        requestAnimationFrame(animatePaddles);
    }

    private createPaddleArrivalEffect(): void {
        console.log("Effet d'arrivée des raquettes au centre");

        this.flashPaddleOnArrival(this.player0, 0);
        this.flashPaddleOnArrival(this.player1, 1);

        this.createCenterImpactParticles(this.player0, MAIN_COLORS.RGB_BLUE);
        this.createCenterImpactParticles(this.player1, MAIN_COLORS.RGB_PURPLE);
    }

    private createPaddleTrailEffect(paddle: Mesh, startPos: Vector3, endPos: Vector3, color: Color3): void {
        const trailParticles = new ParticleSystem("paddleTrail", 150, this.scene);
        
        // Texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        trailParticles.particleTexture = particleTexture;

        trailParticles.emitter = paddle;

        trailParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH/2, -PLAYER_CONFIG.HEIGHT/2, -PLAYER_CONFIG.DEPTH/2);
        trailParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH/2, PLAYER_CONFIG.HEIGHT/2, PLAYER_CONFIG.DEPTH/2);

        trailParticles.color1 = new Color4(
            Math.min(1, color.r * 2.0),
            Math.min(1, color.g * 2.0),
            Math.min(1, color.b * 2.0),
            0.8
        );
        trailParticles.color2 = new Color4(
            Math.min(1, color.r * 1.5),
            Math.min(1, color.g * 1.5),
            Math.min(1, color.b * 1.5),
            0.4
        );
        trailParticles.colorDead = new Color4(color.r, color.g, color.b, 0);

        trailParticles.minSize = 0.5;
        trailParticles.maxSize = 1.5;
        trailParticles.minLifeTime = 0.3;
        trailParticles.maxLifeTime = 0.6;
        trailParticles.blendMode = ParticleSystem.BLENDMODE_ADD;

        const direction = endPos.subtract(startPos).normalize().scale(-1);
        trailParticles.direction1 = direction.scale(2);
        trailParticles.direction2 = direction.scale(4);

        trailParticles.emitRate = 200;
        trailParticles.minEmitPower = 1;
        trailParticles.maxEmitPower = 3;
        trailParticles.gravity = new Vector3(0, 0, 0);

        trailParticles.start();

        setTimeout(() => {
            trailParticles.stop();
            setTimeout(() => {
                trailParticles.dispose();
            }, 800);
        }, 600);
    }
    private flashPaddleOnArrival(paddle: Mesh, playerIndex: number): void {
        const material = paddle.material as StandardMaterial;
        const originalEmissiveColor = material.emissiveColor.clone();
        const playerGlowLayer = playerIndex === 0 ? this.player0GlowLayer : this.player1GlowLayer;
        const originalGlowIntensity = playerGlowLayer?.intensity || 0.8;

        material.emissiveColor = new Color3(1, 1, 1);
        if (playerGlowLayer) {
            playerGlowLayer.intensity = 3.0;
        }

        const flashDuration = 300;
        const startTime = performance.now();
        
        const animateFlash = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / flashDuration, 1);
            
            if (progress < 1) {
                const currentColor = new Color3(
                    1 - progress * (1 - originalEmissiveColor.r),
                    1 - progress * (1 - originalEmissiveColor.g),
                    1 - progress * (1 - originalEmissiveColor.b)
                );
                
                material.emissiveColor = currentColor;
                
                if (playerGlowLayer) {
                    playerGlowLayer.intensity = 3.0 - (progress * (3.0 - originalGlowIntensity));
                }
                
                requestAnimationFrame(animateFlash);
            } else {
                material.emissiveColor = originalEmissiveColor;
                if (playerGlowLayer) {
                    playerGlowLayer.intensity = originalGlowIntensity;
                }
            }
        };
        
        requestAnimationFrame(animateFlash);
    }

    private createCenterImpactParticles(paddle: Mesh, color: Color3): void {
        const impactParticles = new ParticleSystem("centerImpactParticles", 80, this.scene);

        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        impactParticles.particleTexture = particleTexture;

        impactParticles.emitter = paddle.position.clone();

        impactParticles.minEmitBox = new Vector3(-1, -1, -10);
        impactParticles.maxEmitBox = new Vector3(1, 1, 10);

        impactParticles.color1 = new Color4(
            Math.min(1, color.r * 3.0),
            Math.min(1, color.g * 3.0),
            Math.min(1, color.b * 3.0),
            1.0
        );
        impactParticles.color2 = new Color4(1, 1, 1, 1.0);
        impactParticles.colorDead = new Color4(color.r, color.g, color.b, 0);

        impactParticles.minSize = 0.3;
        impactParticles.maxSize = 1.2;
        impactParticles.minLifeTime = 0.4;
        impactParticles.maxLifeTime = 0.8;
        impactParticles.blendMode = ParticleSystem.BLENDMODE_ADD;

        impactParticles.createSphereEmitter(2.0);
        impactParticles.minEmitPower = 5;
        impactParticles.maxEmitPower = 15;
        impactParticles.gravity = new Vector3(0, -2, 0);

        impactParticles.emitRate = 0;
        impactParticles.manualEmitCount = 80;

        impactParticles.start();

        setTimeout(() => {
            impactParticles.stop();
            setTimeout(() => {
                impactParticles.dispose();
            }, 1000);
        }, 100);
    }

    protected createTronSpawnEffect(): void {

        this.ballMaterial.albedoColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveIntensity = 2.0;

        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 1.0;
        }

        this.ball.scaling = new Vector3(0.01, 0.01, 0.01);
        this.ball.isVisible = true;

        this.createSpawnLightEffect();

        const ballScaleAnimation = new Animation(
            "ballScale",
            "scaling",
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        ballScaleAnimation.setKeys([
            { frame: 0, value: new Vector3(0.01, 0.01, 0.01) },
            { frame: 10, value: new Vector3(0.5, 0.5, 0.5) },
            { frame: 20, value: new Vector3(1.5, 1.5, 1.5) },
            { frame: 30, value: new Vector3(1, 1, 1) }
        ]);
        
        const ballEasingFunction = new CircleEase();
        ballEasingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        ballScaleAnimation.setEasingFunction(ballEasingFunction);
        
        this.ball.animations = [];
        this.ball.animations.push(ballScaleAnimation);
        
        // Démarrer l'animation après un court délai
        setTimeout(() => {
            // Lancer le système de particules
            if (this.spawnParticleSystem) {
                this.spawnParticleSystem.start();
                this.spawnParticleSystem.manualEmitCount = Math.floor(300 * this.particleReductionFactor);
            }
            
            // Démarrer l'animation de la balle (pas de ligne verticale à animer)
            this.scene.beginAnimation(this.ball, 0, 30, false);
            
            // Restaurer l'intensité du glow après l'animation
            setTimeout(() => {
                if (this.ballGlowLayer) {
                    this.ballGlowLayer.intensity = 1.0;
                }
                
                // Arrêter les particules après l'animation
                if (this.spawnParticleSystem) {
                    this.spawnParticleSystem.stop();
                }
            }, 700);
        }, 100);
    }

    private createSpawnLightEffect(): void {
        const lightParticles = new ParticleSystem("spawnLightEffect", 150, this.scene);

        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        lightParticles.particleTexture = particleTexture;

        lightParticles.emitter = this.ball.position.clone();
        lightParticles.metadata = { isTemporary: true };

        lightParticles.minEmitBox = new Vector3(-0.5, -100, -0.5);
        lightParticles.maxEmitBox = new Vector3(0.5, 100, 0.5);

        lightParticles.color1 = new Color4(0, 0.8, 1, 1.0);
        lightParticles.color2 = new Color4(0.5, 1, 1, 1.0);
        lightParticles.colorDead = new Color4(0, 0.8, 1, 0);

        lightParticles.minSize = 0.8;
        lightParticles.maxSize = 2.0;
        lightParticles.minLifeTime = 0.3;
        lightParticles.maxLifeTime = 0.8;
        lightParticles.blendMode = ParticleSystem.BLENDMODE_ADD;

        lightParticles.direction1 = new Vector3(0, 1, 0);
        lightParticles.direction2 = new Vector3(0, -1, 0);
        lightParticles.minEmitPower = 2;
        lightParticles.maxEmitPower = 8;
        lightParticles.gravity = new Vector3(0, 0, 0);

        lightParticles.emitRate = 0;
        lightParticles.manualEmitCount = 100;

        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 2.5;
        }

        lightParticles.start();

        setTimeout(() => {
            lightParticles.stop();
            setTimeout(() => {
                lightParticles.dispose();
            }, 500);
        }, 200);
    }
    
    protected setInitialVelocity(): void {
        let directionX = Math.random() > 0.5 ? 1 : -1;
        if (this.lastScoredPlayer === 0) {
            directionX = 1;
        } else if (this.lastScoredPlayer === 1) {
            directionX = -1;
        }
        const maxAngle = Math.PI / 9;
        const randomAngle = (Math.random() * 2 - 1) * maxAngle;
        
        this.velocity = new Vector3(
            directionX * this.options.initialSpeed * Math.cos(randomAngle),
            0,
            this.options.initialSpeed * Math.sin(randomAngle)
        );
        
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

    protected updateBallColor(): void {
        const currentSpeed = this.velocity.length();
        const maxSpeed = this.options.maxSpeed;
        const initialSpeed = this.options.initialSpeed;

        const normalizedSpeed = Math.min(1, Math.max(0, (currentSpeed - initialSpeed) / (maxSpeed - initialSpeed)));
        
        const blueColor = MAIN_COLORS.RGB_BLUE;
        const purpleColor = MAIN_COLORS.RGB_PURPLE;
        const redColor = new Color3(1, 0, 0);
        
        let ballColor;
        if (normalizedSpeed >= 0.999) {
            ballColor = redColor;
        } else {
            const t = normalizedSpeed / 0.999;
            ballColor = new Color3(
                blueColor.r * (1 - t) + purpleColor.r * t,
                blueColor.g * (1 - t) + purpleColor.g * t,
                blueColor.b * (1 - t) + purpleColor.b * t
            );
        }
        
        this.ballMaterial.albedoColor = ballColor;
        this.ballMaterial.emissiveColor = new Color3(
            Math.min(1, ballColor.r * 1.5),
            Math.min(1, ballColor.g * 1.5),
            Math.min(1, ballColor.b * 1.5)
        );
        
        this.ballMaterial.emissiveIntensity = 2.0 + normalizedSpeed * 1.0;
        this.ballMaterial.roughness = 0.05 - normalizedSpeed * 0.05;
        this.ballMaterial.metallic = 0.1;
        
        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 0.8 + normalizedSpeed * 1.2;
        }
    }

    protected update(): void {
        if (this.isResetting) return;

        this.ball.position.addInPlace(this.velocity);
        this.updateBallColor();
        this.handleWallCollisions();
        this.handlePlayerCollisions();
        this.checkScoring();
    }

    protected handleWallCollisions(): void {
        const topWallZ = this.topWall.position.z;
        const bottomWallZ = this.bottomWall.position.z;
        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        if (this.ball.position.z + ballRadius >= topWallZ - this.wallCollisionThreshold && this.velocity.z > 0) {
            this.velocity.z = -this.velocity.z;
            this.ball.position.z = topWallZ - ballRadius - this.wallCollisionThreshold;
            this.animateWallGlow(true);
        }

        if (this.ball.position.z - ballRadius <= bottomWallZ + this.wallCollisionThreshold && this.velocity.z < 0) {
            this.velocity.z = -this.velocity.z;
            this.ball.position.z = bottomWallZ + ballRadius + this.wallCollisionThreshold;
            this.animateWallGlow(false);
        }
    }

    protected handlePlayerCollisions(): void {
        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        const player0Pos = this.player0.position;
        const player1Pos = this.player1.position;
        const paddleWidth = PLAYER_CONFIG.WIDTH;
        const paddleDepth = PLAYER_CONFIG.DEPTH;

        if (this.ball.position.x - ballRadius <= player0Pos.x + paddleWidth/2 && 
            this.ball.position.x > player0Pos.x &&
            this.velocity.x < 0 && 
            Math.abs(this.ball.position.z - player0Pos.z) < paddleDepth/2) {
            
            this.velocity.x = -this.velocity.x;
            const hitPosition = (this.ball.position.z - player0Pos.z) / (paddleDepth/2);
            const maxDeflection = 0.25;
            this.velocity.z = this.velocity.length() * maxDeflection * hitPosition;
            
            this.increaseVelocity();

            if (this.controls && this.controls.ai && this.controls.ai.isAIActive()) {
                setTimeout(() => {
                    const ballPos = this.ball.position.clone();
                    const ballVel = this.velocity.clone();
                    this.controls!.ai!.notifyPlayer0Hit(ballPos, ballVel);
                }, 16);
            }
            if (this.pongInstance && this.pongInstance.animatePlayerGlow) {
                this.pongInstance.animatePlayerGlow(0);
            } else {
                this.animatePlayerGlow(0);
            }
        }

        if (this.ball.position.x + ballRadius >= player1Pos.x - paddleWidth/2 && 
            this.ball.position.x < player1Pos.x &&
            this.velocity.x > 0 && 
            Math.abs(this.ball.position.z - player1Pos.z) < paddleDepth/2) {
            
            this.velocity.x = -this.velocity.x;

            const hitPosition = (this.ball.position.z - player1Pos.z) / (paddleDepth/2);
            const maxDeflection = 0.25;
            this.velocity.z = this.velocity.length() * maxDeflection * hitPosition;
            
            this.increaseVelocity();

            if (this.pongInstance && this.pongInstance.animatePlayerGlow) {
                this.pongInstance.animatePlayerGlow(1);
            } else {
                this.animatePlayerGlow(1);
            }
        }
    }

    protected checkScoring(): void {
        if (this.isResetting) return;

        const isMultiplayerMode = this.gameData.gameType === GameType.MULTIPLAYER_PONG;

        if (this.ball.position.x > BALL_CONFIG.OUT_OF_BOUNDS_X) {
            this.isResetting = true;
            
            
            if (isMultiplayerMode) {

                this.createBallDisintegrationEffect(0);

                if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                    this.pongInstance.createPaddleDisintegrationEffect(0);
                } else {
                    this.createPaddleDisintegrationEffect(0);
                }

                setTimeout(() => {
                    this.gameData.scorePlayer1();
                    this.lastScoredPlayer = 2;
                    this.resetBallWithAnimation(true);
                }, 300);
                
            } else {
                this.createBallDisintegrationEffect(0);
                if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                    this.pongInstance.createPaddleDisintegrationEffect(0);
                } else {
                    this.createPaddleDisintegrationEffect(0);
                }

                setTimeout(() => {
                    this.gameData.scorePlayer0();
                    this.lastScoredPlayer = 0;
                    this.resetBallWithAnimation(true);
                }, 300);
            }
        } 
        else if (this.ball.position.x < -BALL_CONFIG.OUT_OF_BOUNDS_X) {
            this.isResetting = true;
            
            if (isMultiplayerMode) {
                this.createBallDisintegrationEffect(1);

                if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                    this.pongInstance.createPaddleDisintegrationEffect(1);
                } else {
                    this.createPaddleDisintegrationEffect(1);
                }

                setTimeout(() => {
                    this.gameData.scorePlayer1();
                    this.lastScoredPlayer = 2;
                    this.resetBallWithAnimation(true);
                }, 300);
                
            } else {
                this.createBallDisintegrationEffect(1);

                if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                    this.pongInstance.createPaddleDisintegrationEffect(1);
                } else {
                    this.createPaddleDisintegrationEffect(1);
                }
                
                setTimeout(() => {
                    this.gameData.scorePlayer1();
                    this.lastScoredPlayer = 1;
                    this.resetBallWithAnimation(true);
                }, 300);
            }
        }
    }

    protected increaseVelocity(): void {
        const currentSpeed = this.velocity.length();
        if (currentSpeed < this.options.maxSpeed) {
            const speedFactor = (currentSpeed + this.options.speedIncrement) / currentSpeed;
            this.velocity.scaleInPlace(speedFactor);
            this.updateBallColor();
        }
    }

    private animateWallGlow(isTopWall: boolean): void {
        const wallPlane = isTopWall ? this.topWallPlane : this.bottomWallPlane;
        const wallGlowLayer = isTopWall ? this.topWallGlowLayer : this.bottomWallGlowLayer;
        
        if (!wallPlane || !(wallPlane.material instanceof StandardMaterial) || !wallGlowLayer) return;

        if ((isTopWall && this.isTopWallGlowing) || (!isTopWall && this.isBottomWallGlowing)) {
            return;
        }
        
        if (isTopWall) {
            this.isTopWallGlowing = true;
        } else {
            this.isBottomWallGlowing = true;
        }

        const originalGlowIntensity = wallGlowLayer.intensity;

        const material = wallPlane.material as StandardMaterial;
        const originalEmissiveColor = material.emissiveColor ? material.emissiveColor.clone() : new Color3(0.7, 0.7, 0.7);
        material.emissiveColor = new Color3(1, 1, 1);
        
        wallGlowLayer.intensity = 2.0;

        this.createImpactParticles(isTopWall);

        const startTime = performance.now();
        const animate = () => {
            const elapsedTime = performance.now() - startTime;
            const progress = Math.min(elapsedTime / this.wallGlowAnimationDuration, 1);
            
            if (progress < 1) {
                const currentEmissive = new Color3(
                    1 - progress * (1 - originalEmissiveColor.r),
                    1 - progress * (1 - originalEmissiveColor.g),
                    1 - progress * (1 - originalEmissiveColor.b)
                );

                material.emissiveColor = currentEmissive;

                wallGlowLayer.intensity = 2.0 - (progress * (2.0 - originalGlowIntensity));
                
                requestAnimationFrame(animate);
            } else {
                material.emissiveColor = originalEmissiveColor;

                wallGlowLayer.intensity = originalGlowIntensity;

                if (isTopWall) {
                    this.isTopWallGlowing = false;
                } else {
                    this.isBottomWallGlowing = false;
                }
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    private createImpactParticles(isTopWall: boolean): void {
        const wall = isTopWall ? this.topWall : this.bottomWall;

        const impactParticles = new ParticleSystem("impactParticles", 50, this.scene);

        const emitterPosition = new Vector3(
            this.ball.position.x,
            this.ball.position.y,
            wall.position.z
        );
        impactParticles.emitter = emitterPosition;

        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        impactParticles.particleTexture = particleTexture;

        const color = isTopWall ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        impactParticles.color1 = new Color4(color.r, color.g, color.b, 1.0);
        impactParticles.color2 = new Color4(color.r, color.g, color.b, 1.0);
        impactParticles.colorDead = new Color4(color.r, color.g, color.b, 0.0);

        impactParticles.minSize = 0.5;
        impactParticles.maxSize = 1.5;
        impactParticles.minLifeTime = 0.2;
        impactParticles.maxLifeTime = 0.4;
        impactParticles.blendMode = ParticleSystem.BLENDMODE_ADD;

        impactParticles.minEmitBox = new Vector3(-5, -1, 0);
        impactParticles.maxEmitBox = new Vector3(5, 1, 0);
        impactParticles.direction1 = new Vector3(5, 0, 0);
        impactParticles.direction2 = new Vector3(-5, 0, 0);

        impactParticles.emitRate = 0;
        impactParticles.manualEmitCount = 50;
        impactParticles.gravity = new Vector3(0, 0, 0);

        impactParticles.start();

        setTimeout(() => {
            impactParticles.stop();
            setTimeout(() => {
                impactParticles.dispose();
            }, 500);
        }, 100);
    }

    private animatePlayerGlow(playerIndex: number): void {
        const player = playerIndex === 0 ? this.player0 : this.player1;
        const playerGlowLayer = playerIndex === 0 ? this.player0GlowLayer : this.player1GlowLayer;
        const isGlowing = playerIndex === 0 ? this.isPlayer0Glowing : this.isPlayer1Glowing;

        if (!player || !playerGlowLayer || !(player.material instanceof StandardMaterial) || isGlowing) {
            return;
        }

        if (playerIndex === 0) {
            this.isPlayer0Glowing = true;
        } else {
            this.isPlayer1Glowing = true;
        }

        const originalGlowIntensity = playerGlowLayer.intensity;
        const material = player.material as StandardMaterial;
        const originalEmissiveColor = material.emissiveColor ? material.emissiveColor.clone() : 
            playerIndex === 0 ? MAIN_COLORS.RGB_BLUE.scale(0.5) : MAIN_COLORS.RGB_PURPLE.scale(0.5);

        material.emissiveColor = new Color3(1, 1, 1);
        playerGlowLayer.intensity = 2.0;

        this.createPlayerImpactParticles(playerIndex);

        const startTime = performance.now();
        const animate = () => {
            const elapsedTime = performance.now() - startTime;
            const progress = Math.min(elapsedTime / this.playerGlowAnimationDuration, 1);
            
            if (progress < 1) {
                const currentEmissive = new Color3(
                    1 - progress * (1 - originalEmissiveColor.r),
                    1 - progress * (1 - originalEmissiveColor.g),
                    1 - progress * (1 - originalEmissiveColor.b)
                );

                material.emissiveColor = currentEmissive;
                playerGlowLayer.intensity = 2.0 - (progress * (2.0 - originalGlowIntensity));
                
                requestAnimationFrame(animate);
            } else {
                material.emissiveColor = originalEmissiveColor;
                playerGlowLayer.intensity = originalGlowIntensity;
                
                if (playerIndex === 0) {
                    this.isPlayer0Glowing = false;
                } else {
                    this.isPlayer1Glowing = false;
                }
            }
        };
        
        requestAnimationFrame(animate);
    }

    private createPlayerImpactParticles(playerIndex: number): void {
        const player = playerIndex === 0 ? this.player0 : this.player1;

        const impactParticles = new ParticleSystem("playerImpactParticles", 50, this.scene);

        const emitterPosition = new Vector3(
            player.position.x,
            player.position.y,
            this.ball.position.z
        );
        impactParticles.emitter = emitterPosition;

        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        impactParticles.particleTexture = particleTexture;

        const color = playerIndex === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        impactParticles.color1 = new Color4(color.r, color.g, color.b, 1.0);
        impactParticles.color2 = new Color4(color.r, color.g, color.b, 1.0);
        impactParticles.colorDead = new Color4(color.r, color.g, color.b, 0.0);

        impactParticles.minSize = 0.5;
        impactParticles.maxSize = 1.5;
        impactParticles.minLifeTime = 0.2;
        impactParticles.maxLifeTime = 0.4;
        impactParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        const directionX = playerIndex === 0 ? 1 : -1;
        impactParticles.direction1 = new Vector3(directionX * 5, 0, 1);
        impactParticles.direction2 = new Vector3(directionX * 5, 0, -1);

        impactParticles.emitRate = 0;
        impactParticles.manualEmitCount = 50;
        impactParticles.gravity = new Vector3(0, 0, 0);

        impactParticles.start();
        
        // Nettoyage
        setTimeout(() => {
            impactParticles.stop();
            setTimeout(() => {
                impactParticles.dispose();
            }, 500);
        }, 100);
    }

    protected createBallDisintegrationEffect(playerScored: number): void {
        console.log(`Création de l'effet de désintégration pour le joueur ${playerScored} (optimisé)`);
        
        const ballPosition = this.ball.position.clone();
        
        const particleCount = Math.floor(240 * this.particleReductionFactor);
        const fastParticles = new ParticleSystem("fastBallParticles", particleCount, this.scene);

        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        fastParticles.particleTexture = particleTexture;

        fastParticles.emitter = ballPosition;

        fastParticles.minEmitBox = new Vector3(-0.4, -0.4, -0.4);
        fastParticles.maxEmitBox = new Vector3(0.4, 0.4, 0.4);

        const mainColor = playerScored === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        
        fastParticles.color1 = new Color4(
            Math.min(1, mainColor.r * 2.5),
            Math.min(1, mainColor.g * 2.5),
            Math.min(1, mainColor.b * 2.5),
            1.0
        );
        fastParticles.color2 = new Color4(1, 1, 1, 1.0);
        fastParticles.colorDead = new Color4(
            mainColor.r,
            mainColor.g,
            mainColor.b,
            0
        );

        fastParticles.minSize = 1.5;
        fastParticles.maxSize = 4.5;

        fastParticles.minLifeTime = 1.0;
        fastParticles.maxLifeTime = 2.0;

        const velocityDirection = this.velocity.normalize();

        const baseSpeed = 100;
        const dispersionAngle = Math.PI / 12;

        const perpendicular1 = new Vector3(-velocityDirection.z, 0, velocityDirection.x).normalize();
        const perpendicular2 = Vector3.Cross(velocityDirection, perpendicular1).normalize();

        const mainDirection = velocityDirection.scale(baseSpeed);
        const dispersionRadius = 8;
        
        fastParticles.direction1 = mainDirection.add(perpendicular1.scale(-dispersionRadius)).add(perpendicular2.scale(-dispersionRadius));
        fastParticles.direction2 = mainDirection.add(perpendicular1.scale(dispersionRadius)).add(perpendicular2.scale(dispersionRadius));

        fastParticles.minEmitPower = 80;
        fastParticles.maxEmitPower = 130;

        fastParticles.blendMode = ParticleSystem.BLENDMODE_ADD;

        fastParticles.createConeEmitter(1.2, dispersionAngle);

        fastParticles.minAngularSpeed = -3.0;
        fastParticles.maxAngularSpeed = 3.0;

        const manualEmitCount = Math.floor(180 * this.particleReductionFactor);
        fastParticles.emitRate = 0;
        fastParticles.manualEmitCount = manualEmitCount;

        fastParticles.addVelocityGradient(0, 5.0);
        fastParticles.addVelocityGradient(0.2, 4.5);
        fastParticles.addVelocityGradient(0.5, 4.0);
        fastParticles.addVelocityGradient(0.8, 3.5);
        fastParticles.addVelocityGradient(1.0, 3.0);
        
        fastParticles.gravity = new Vector3(0, 0, 0);
        
        this.ball.isVisible = false;
        
        fastParticles.start();
        
        setTimeout(() => {
            fastParticles.stop();
            
            setTimeout(() => {
                fastParticles.dispose();
            }, 2000);
        }, 250);
    }

    private createPaddleDisintegrationEffect(playerScored: number): void {
        
        if (this.gameData.gameType === GameType.MULTIPLAYER_PONG)
                return ;
        const paddleToDisintegrate = playerScored === 0 ? this.player1 : this.player0;
        const paddleColor = playerScored === 0 ? MAIN_COLORS.RGB_PURPLE : MAIN_COLORS.RGB_BLUE;
        
        const paddlePosition = paddleToDisintegrate.position.clone();
        
        const paddleParticles = new ParticleSystem("paddleDisintegrationParticles", 390, this.scene);

        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        paddleParticles.particleTexture = particleTexture;

        paddleParticles.emitter = paddlePosition;

        paddleParticles.minEmitBox = new Vector3(-3, -3, -25);
        paddleParticles.maxEmitBox = new Vector3(3, 3, 25);
        
        paddleParticles.color1 = new Color4(
            Math.min(1, paddleColor.r * 4.0),
            Math.min(1, paddleColor.g * 4.0),
            Math.min(1, paddleColor.b * 4.0),
            1.0
        );
        paddleParticles.color2 = new Color4(1.0, 1.0, 1.0, 1.0);
        paddleParticles.colorDead = new Color4(
            Math.min(1, paddleColor.r * 2.0),
            Math.min(1, paddleColor.g * 2.0),
            Math.min(1, paddleColor.b * 2.0),
            0
        );
        
        paddleParticles.minSize = 1.2;
        paddleParticles.maxSize = 3.5;
        
        paddleParticles.minLifeTime = 1.0;
        paddleParticles.maxLifeTime = 2.0;
        
        const directionX = playerScored === 0 ? 1 : -1;
        paddleParticles.direction1 = new Vector3(directionX * 32, -12, -16);
        paddleParticles.direction2 = new Vector3(directionX * 32, 12, 16);
        
        paddleParticles.minEmitPower = 24;
        paddleParticles.maxEmitPower = 48;
        
        paddleParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        paddleParticles.createBoxEmitter(
            new Vector3(directionX, 0, 0),
            new Vector3(directionX, 0, 0),
            new Vector3(-3, -3, -25),
            new Vector3(3, 3, 25)
        );
        
        paddleParticles.minAngularSpeed = -3.0;
        paddleParticles.maxAngularSpeed = 3.0;
        
        paddleParticles.emitRate = 0;
        paddleParticles.manualEmitCount = 325;
        
        paddleParticles.gravity = new Vector3(0, -8, 0);
        
        const originalAlpha = (paddleToDisintegrate.material as StandardMaterial).alpha || 1.0;
        (paddleToDisintegrate.material as StandardMaterial).alpha = 0.2;
        
        paddleParticles.start();
        
        setTimeout(() => {
            paddleParticles.stop();
            
            (paddleToDisintegrate.material as StandardMaterial).alpha = originalAlpha;
            
            setTimeout(() => {
                paddleParticles.dispose();
            }, 3000);
        }, 500);
    }
}