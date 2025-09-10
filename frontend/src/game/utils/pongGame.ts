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

// Modifier l'interface GlowLayerOptions
export interface GlowLayerOptions {
    ballGlowLayer?: GlowLayer;
    topWallGlowLayer?: GlowLayer;
    bottomWallGlowLayer?: GlowLayer;
    player0GlowLayer?: GlowLayer;
    player1GlowLayer?: GlowLayer;
}

// Modifier la classe PongBall

export class PongBall {
    protected ball: Mesh; // Changé de private à protected
    protected player0: Mesh; // Changé de private à protected
    protected player1: Mesh; // Changé de private à protected
    protected velocity: Vector3 = new Vector3(0, 0, 0);
    protected options: BallOptions;
    protected topWall: Mesh;
    protected bottomWall: Mesh;
    private wallCollisionThreshold = BALL_CONFIG.COLLISION_THRESHOLD;
    protected gameData: PongData; // Changé de private à protected
    protected lastScoredPlayer = -1; // Changé de private à protected pour MultiplayerPongBall
    protected ballMaterial: PBRMaterial;
    protected isResetting = false;
    protected velocityAlreadySet = false; // NOUVEAU : Flag pour éviter les appels multiples
    private goalDelayMs = 1000; // 1 second delay after a goal
    private wallGlowAnimationDuration = 300; // en millisecondes
    private isTopWallGlowing = false;
    private isBottomWallGlowing = false;
    private topWallPlane: Mesh | null = null;
    private bottomWallPlane: Mesh | null = null;
    private spawnParticleSystem: ParticleSystem | null = null;
    protected ballGlowLayer?: GlowLayer;
    protected topWallGlowLayer?: GlowLayer;
    protected bottomWallGlowLayer?: GlowLayer;
    private gameOverDelayMs = 3000; // 3 secondes de délai avant reset
    protected player0GlowLayer?: GlowLayer;
    protected player1GlowLayer?: GlowLayer;
    private isPlayer0Glowing = false;
    private isPlayer1Glowing = false;
    private playerGlowAnimationDuration = 300; // même durée que pour les murs
    protected controls: PongControls | null = null;
    private particleReductionFactor = GAME_CONFIG.OPTIMIZATION.PARTICLE_REDUCTION_FACTOR;
    protected pongInstance?: any; // Changé de private à protected

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
        pongInstance?: any // Ajouter le paramètre optionnel
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
        this.pongInstance = pongInstance; // Stocker la référence
        
        // Create and setup ball material
        this.ballMaterial = new PBRMaterial("ballMaterial", this.scene);
        this.setupBallMaterial();
        this.ball.material = this.ballMaterial;
        
        // Setup spawn particle system
        this.setupSpawnParticleSystem();
        
        // Cacher la balle au départ pour éviter de la voir bouger
        this.ball.isVisible = false;
        this.isResetting = true;
        
        // Register update function
        this.scene.registerBeforeRender(() => this.update());
        
        // Écouter les événements du jeu
        this.setupGameEventListeners();
    }
    
    private setupGameEventListeners(): void {
        // Attendre avant de réinitialiser le jeu après un game over
        this.gameData.on(GameEvents.PLAYER_WON, () => {
            // Arrêter la balle et la rendre invisible
            this.isResetting = true;
            this.ball.isVisible = false;
            
            // Verrouiller les contrôles pendant le game over
            if (this.controls) {
                this.controls.setControlsLocked(true);
            }
        });
        
        // Flag pour gérer le premier démarrage
        let initialStartDone = false;
        
        // Réagir aux changements d'état du jeu
        this.gameData.on(GameEvents.GAME_STATE_CHANGED, (state: GameState) => {
            if (state === GameState.PLAYING) {
            // Initialisation seulement au premier passage à PLAYING
            if (!initialStartDone) {
                initialStartDone = true;
                console.log("Premier démarrage du jeu - initialisation");
                
                // Attendre un court délai pour s'assurer que tout est prêt
                setTimeout(() => {
                this.resetBallWithAnimation();
                }, 500);
            }
            // Réinitialisation après un game over
            else if (this.isResetting) {
                console.log("Réinitialisation après game over");
                
                // Délai plus long pour s'assurer que le message a disparu
                setTimeout(() => {
                this.resetBallWithAnimation();
                }, 1500);
            }
            }
        });
    }
    
    private setupBallMaterial(): void {
        // Style néon/Tron pour la balle
        this.ballMaterial.metallic = 0.1;
        this.ballMaterial.roughness = 0;
        this.ballMaterial.albedoColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveIntensity = 2.0;
        this.ballMaterial.ambientColor = MAIN_COLORS.RGB_BLUE.scale(0.5);
        
        // Ajouter un effet de brillance plus lumineux
        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 1.0;
        }
    }
    
    private setupSpawnParticleSystem(): void {
        // Système de particules optimisé pour l'apparition
        const particleCount = Math.floor(200 * this.particleReductionFactor); // Réduit selon le facteur
        this.spawnParticleSystem = new ParticleSystem("spawnParticles", particleCount, this.scene);
        
        // Texture des particules (cercle lumineux)
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        this.spawnParticleSystem.particleTexture = particleTexture;
        
        // Configurer les particules
        this.spawnParticleSystem.emitter = this.ball;
        this.spawnParticleSystem.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
        this.spawnParticleSystem.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
        
        // Couleurs et transparence (convertir Color3 en Color4)
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
        
        // Taille des particules - légèrement réduite
        this.spawnParticleSystem.minSize = 0.15; // Réduit de 0.2
        this.spawnParticleSystem.maxSize = 0.4;  // Réduit de 0.5
        
        // Durée de vie - réduite
        this.spawnParticleSystem.minLifeTime = 0.25; // Réduit de 0.3
        this.spawnParticleSystem.maxLifeTime = 0.5;  // Réduit de 0.6
        
        // Émission optimisée
        const emitRate = Math.floor(200 * this.particleReductionFactor);
        const manualEmitCount = Math.floor(300 * this.particleReductionFactor);
        
        this.spawnParticleSystem.emitRate = emitRate;
        this.spawnParticleSystem.manualEmitCount = manualEmitCount;
        this.spawnParticleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Vitesse
        this.spawnParticleSystem.minEmitPower = 4; // Réduit de 5
        this.spawnParticleSystem.maxEmitPower = 8; // Réduit de 10
        
        // Forme d'émission sphérique
        this.spawnParticleSystem.createSphereEmitter(1.5); // Réduit de 2
        
        // Ne pas démarrer tout de suite
        this.spawnParticleSystem.stop();
    }

    protected resetBallWithAnimation(isGoal = false): void { // Changé de private à protected
        // Ne pas réinitialiser si le jeu est en état GAME_OVER
        if (this.gameData.gameState === GameState.GAME_OVER) {
            return;
        }
        
        // CORRECTION : Supprimer la condition qui bloque les goals - permettre toujours la réinitialisation
        console.log("Réinitialisation de la balle - isGoal:", isGoal, "isResetting:", this.isResetting);
        
        // Pause ball movement during reset
        this.isResetting = true;
        
        // NOUVEAU : Réinitialiser le flag de vélocité pour permettre un nouvel appel de setInitialVelocity
        this.velocityAlreadySet = false;
        
        // Verrouiller les contrôles pendant le reset
        if (this.controls) {
            this.controls.setControlsLocked(true);
        }
        
        // ANIMATION CONDITIONNELLE : Animer le retour des raquettes au centre seulement si nécessaire
        this.animatePaddlesToCenter();
        
        // Set final ball position (mais ne pas la rendre visible immédiatement)
        const targetPosition = new Vector3(
            BALL_CONFIG.INITIAL_POSITION.X, 
            BALL_CONFIG.INITIAL_POSITION.Y, 
            BALL_CONFIG.INITIAL_POSITION.Z
        );
        this.ball.position = targetPosition;
        
        // Réinitialiser les couleurs de la balle à sa couleur de base (bleu)
        this.ballMaterial.albedoColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveIntensity = 2.0;
        
        // Réinitialiser l'intensité du glow de la balle
        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 1.0;
        }
        
        if (isGoal) {
            setTimeout(() => {
                this.createTronSpawnEffect();
                setTimeout(() => {
                    // CORRECTION : S'assurer qu'on n'appelle setInitialVelocity qu'une seule fois
                    if (!this.velocityAlreadySet) {
                        this.setInitialVelocity();
                        this.velocityAlreadySet = true; // Marquer après l'appel
                    } else {
                        console.log("⚠️ setInitialVelocity ignoré - déjà défini par une classe héritée");
                    }
                    this.isResetting = false;
                    
                    // Déverrouiller les contrôles
                    if (this.controls) {
                        this.controls.setControlsLocked(false);
                    }
                }, this.goalDelayMs);
            }, 200);
        } else {
            // Pour les débuts de partie ou les remises en jeu non-goal
            setTimeout(() => {
                this.createTronSpawnEffect();
                setTimeout(() => {
                    // CORRECTION : S'assurer qu'on n'appelle setInitialVelocity qu'une seule fois
                    if (!this.velocityAlreadySet) {
                        this.setInitialVelocity();
                        this.velocityAlreadySet = true; // Marquer après l'appel
                    } else {
                        console.log("⚠️ setInitialVelocity ignoré - déjà défini par une classe héritée");
                    }
                    this.isResetting = false;
                    
                    // Déverrouiller les contrôles
                    if (this.controls) {
                        this.controls.setControlsLocked(false);
                    }
                }, 500);
            }, 100);
        }
    }

    // NOUVELLE MÉTHODE : Animation du retour des raquettes au centre
    private animatePaddlesToCenter(): void {
        console.log("Animation du retour des raquettes au centre");
        
        // Positions actuelles des raquettes
        const player0CurrentPos = this.player0.position.clone();
        const player1CurrentPos = this.player1.position.clone();
        
        // Positions cibles (centre)
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
        
        // Vérifier quelles raquettes ont réellement bougé (distance > seuil)
        const distanceThreshold = 5; // Seuil minimal pour considérer qu'une raquette a bougé
        
        const player0HasMoved = Math.abs(player0CurrentPos.z - player0TargetPos.z) > distanceThreshold;
        const player1HasMoved = Math.abs(player1CurrentPos.z - player1TargetPos.z) > distanceThreshold;
        
        // Si aucune raquette n'a bougé, pas d'animation
        if (!player0HasMoved && !player1HasMoved) {
            console.log("Aucune raquette n'a bougé suffisamment - pas d'animation");
            // Juste s'assurer qu'elles sont à la bonne position
            this.player0.position = player0TargetPos;
            this.player1.position = player1TargetPos;
            return;
        }
        
        // Déterminer qui a encaissé le goal pour cibler l'animation
        let targetPaddle: Mesh | "both" | null = null;
        let targetCurrentPos: Vector3 | null = null;
        let targetFinalPos: Vector3 | null = null;
        let targetColor: Color3 | null = null;
        
        // Si c'est après un goal, animer seulement la raquette qui a encaissé
        if (this.lastScoredPlayer >= 0) {
            const losingPlayerIndex = this.lastScoredPlayer === 0 ? 1 : 0; // Celui qui a encaissé
            
            if (losingPlayerIndex === 0 && player0HasMoved) {
                targetPaddle = this.player0;
                targetCurrentPos = player0CurrentPos;
                targetFinalPos = player0TargetPos;
                targetColor = MAIN_COLORS.RGB_BLUE;
                
                // Mettre directement player1 à sa position sans animation
                this.player1.position = player1TargetPos;
            } else if (losingPlayerIndex === 1 && player1HasMoved) {
                targetPaddle = this.player1;
                targetCurrentPos = player1CurrentPos;
                targetFinalPos = player1TargetPos;
                targetColor = MAIN_COLORS.RGB_PURPLE;
                
                // Mettre directement player0 à sa position sans animation
                this.player0.position = player0TargetPos;
            }
        } else {
            // Premier démarrage du jeu - animer toutes les raquettes qui ont bougé
            if (player0HasMoved && player1HasMoved) {
                // Les deux ont bougé, animer les deux
                this.createPaddleTrailEffect(this.player0, player0CurrentPos, player0TargetPos, MAIN_COLORS.RGB_BLUE);
                this.createPaddleTrailEffect(this.player1, player1CurrentPos, player1TargetPos, MAIN_COLORS.RGB_PURPLE);
                targetPaddle = "both";
            } else if (player0HasMoved) {
                targetPaddle = this.player0;
                targetCurrentPos = player0CurrentPos;
                targetFinalPos = player0TargetPos;
                targetColor = MAIN_COLORS.RGB_BLUE;
                // Mettre player1 directement en place
                this.player1.position = player1TargetPos;
            } else if (player1HasMoved) {
                targetPaddle = this.player1;
                targetCurrentPos = player1CurrentPos;
                targetFinalPos = player1TargetPos;
                targetColor = MAIN_COLORS.RGB_PURPLE;
                // Mettre player0 directement en place
                this.player0.position = player0TargetPos;
            }
        }
        
        // Si aucune raquette cible identifiée, sortir
        if (!targetPaddle) {
            console.log("Aucune raquette cible identifiée - repositionnement direct");
            this.player0.position = player0TargetPos;
            this.player1.position = player1TargetPos;
            return;
        }
        
        // Créer l'effet de traînée seulement pour la raquette cible
        if (targetPaddle !== "both" && targetCurrentPos && targetFinalPos && targetColor) {
            console.log(`Animation pour la raquette ${targetPaddle === this.player0 ? '0' : '1'} seulement`);
            this.createPaddleTrailEffect(targetPaddle, targetCurrentPos, targetFinalPos, targetColor);
        }
        
        // Animation avec easing
        const animationDuration = 600; // ms
        const startTime = performance.now();
        
        // Fonction d'easing pour un mouvement fluide
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
                
                // Animer seulement les raquettes qui doivent bouger
                if (targetPaddle === "both") {
                    // Animer les deux
                    this.player0.position = Vector3.Lerp(player0CurrentPos, player0TargetPos, easedProgress);
                    this.player1.position = Vector3.Lerp(player1CurrentPos, player1TargetPos, easedProgress);
                } else if (targetPaddle === this.player0 && targetCurrentPos && targetFinalPos) {
                    // Animer seulement player0 - avec vérification de null
                    this.player0.position = Vector3.Lerp(targetCurrentPos, targetFinalPos, easedProgress);
                } else if (targetPaddle === this.player1 && targetCurrentPos && targetFinalPos) {
                    // Animer seulement player1 - avec vérification de null
                    this.player1.position = Vector3.Lerp(targetCurrentPos, targetFinalPos, easedProgress);
                }
                
                requestAnimationFrame(animatePaddles);
            } else {
                // S'assurer que les raquettes sont exactement à la position finale
                this.player0.position = player0TargetPos;
                this.player1.position = player1TargetPos;
                
                // Créer un effet d'arrivée seulement pour la raquette qui a bougé
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

    // NOUVELLE MÉTHODE : Effet d'arrivée lorsque les raquettes atteignent le centre
    private createPaddleArrivalEffect(): void {
        console.log("Effet d'arrivée des raquettes au centre");
        
        // Flash temporaire des raquettes SEULEMENT
        this.flashPaddleOnArrival(this.player0, 0);
        this.flashPaddleOnArrival(this.player1, 1);
        
        // Particules d'impact au centre pour chaque raquette
        this.createCenterImpactParticles(this.player0, MAIN_COLORS.RGB_BLUE);
        this.createCenterImpactParticles(this.player1, MAIN_COLORS.RGB_PURPLE);
    }

    // NOUVELLE MÉTHODE : Effet de traînée lors du mouvement des raquettes
    private createPaddleTrailEffect(paddle: Mesh, startPos: Vector3, endPos: Vector3, color: Color3): void {
        // Créer un système de particules de traînée
        const trailParticles = new ParticleSystem("paddleTrail", 150, this.scene);
        
        // Texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        trailParticles.particleTexture = particleTexture;
        
        // Positionner l'émetteur sur la raquette
        trailParticles.emitter = paddle;
        
        // Zone d'émission autour de la raquette
        trailParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH/2, -PLAYER_CONFIG.HEIGHT/2, -PLAYER_CONFIG.DEPTH/2);
        trailParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH/2, PLAYER_CONFIG.HEIGHT/2, PLAYER_CONFIG.DEPTH/2);
        
        // Couleurs des particules
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
        
        // Configuration des particules
        trailParticles.minSize = 0.5;
        trailParticles.maxSize = 1.5;
        trailParticles.minLifeTime = 0.3;
        trailParticles.maxLifeTime = 0.6;
        trailParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Direction opposée au mouvement pour créer une traînée
        const direction = endPos.subtract(startPos).normalize().scale(-1);
        trailParticles.direction1 = direction.scale(2);
        trailParticles.direction2 = direction.scale(4);
        
        // Émission
        trailParticles.emitRate = 200;
        trailParticles.minEmitPower = 1;
        trailParticles.maxEmitPower = 3;
        trailParticles.gravity = new Vector3(0, 0, 0);
        
        // Démarrer les particules
        trailParticles.start();
        
        // Arrêter les particules après l'animation
        setTimeout(() => {
            trailParticles.stop();
            setTimeout(() => {
                trailParticles.dispose();
            }, 800);
        }, 600);
    }
    // NOUVELLE MÉTHODE : Flash de la raquette à l'arrivée
    private flashPaddleOnArrival(paddle: Mesh, playerIndex: number): void {
        const material = paddle.material as StandardMaterial;
        const originalEmissiveColor = material.emissiveColor.clone();
        const playerGlowLayer = playerIndex === 0 ? this.player0GlowLayer : this.player1GlowLayer;
        const originalGlowIntensity = playerGlowLayer?.intensity || 0.8;
        
        // Flash blanc brillant
        material.emissiveColor = new Color3(1, 1, 1);
        if (playerGlowLayer) {
            playerGlowLayer.intensity = 3.0;
        }
        
        // Animation de retour à la normale
        const flashDuration = 300;
        const startTime = performance.now();
        
        const animateFlash = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / flashDuration, 1);
            
            if (progress < 1) {
                // Interpoler vers la couleur originale
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
                // Restaurer les valeurs originales
                material.emissiveColor = originalEmissiveColor;
                if (playerGlowLayer) {
                    playerGlowLayer.intensity = originalGlowIntensity;
                }
            }
        };
        
        requestAnimationFrame(animateFlash);
    }

    // NOUVELLE MÉTHODE : Particules d'impact au centre
    private createCenterImpactParticles(paddle: Mesh, color: Color3): void {
        // Créer un système de particules d'impact
        const impactParticles = new ParticleSystem("centerImpactParticles", 80, this.scene);
        
        // Texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        impactParticles.particleTexture = particleTexture;
        
        // Position de l'émetteur à la raquette
        impactParticles.emitter = paddle.position.clone();
        
        // Zone d'émission
        impactParticles.minEmitBox = new Vector3(-1, -1, -10);
        impactParticles.maxEmitBox = new Vector3(1, 1, 10);
        
        // Couleurs brillantes
        impactParticles.color1 = new Color4(
            Math.min(1, color.r * 3.0),
            Math.min(1, color.g * 3.0),
            Math.min(1, color.b * 3.0),
            1.0
        );
        impactParticles.color2 = new Color4(1, 1, 1, 1.0);
        impactParticles.colorDead = new Color4(color.r, color.g, color.b, 0);
        
        // Configuration
        impactParticles.minSize = 0.3;
        impactParticles.maxSize = 1.2;
        impactParticles.minLifeTime = 0.4;
        impactParticles.maxLifeTime = 0.8;
        impactParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Émission radiale
        impactParticles.createSphereEmitter(2.0);
        impactParticles.minEmitPower = 5;
        impactParticles.maxEmitPower = 15;
        impactParticles.gravity = new Vector3(0, -2, 0);
        
        // Émission unique
        impactParticles.emitRate = 0;
        impactParticles.manualEmitCount = 80;
        
        // Démarrer
        impactParticles.start();
        
        // Nettoyage
        setTimeout(() => {
            impactParticles.stop();
            setTimeout(() => {
                impactParticles.dispose();
            }, 1000);
        }, 100);
    }

    protected createTronSpawnEffect(): void {
        // Effet d'apparition style Tron/Néon
        
        // Réinitialiser immédiatement les couleurs de la balle
        // IMPORTANT: Ceci doit être fait avant l'animation pour éviter de voir l'ancienne couleur
        this.ballMaterial.albedoColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveIntensity = 2.0;
        
        // Réinitialiser également l'intensité du glow
        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 1.0;
        }
        
        // Rendre la balle invisible au début
        this.ball.scaling = new Vector3(0.01, 0.01, 0.01);
        this.ball.isVisible = true;
        
        // CORRECTION MAJEURE : Créer l'effet sans ligne verticale pour éviter les collisions fantômes
        // Remplacer par un effet de particules plus spectaculaire
        this.createSpawnLightEffect();
        
        // Animation de la balle qui grandit (sans ligne verticale)
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
    
    // NOUVELLE MÉTHODE : Effet lumineux de spawn sans objets mesh
    private createSpawnLightEffect(): void {
        // Créer un effet lumineux avec des particules seulement
        const lightParticles = new ParticleSystem("spawnLightEffect", 150, this.scene);
        
        // Texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        lightParticles.particleTexture = particleTexture;
        
        // Position à la balle
        lightParticles.emitter = this.ball.position.clone();
        
        // CRITIQUE : Marquer comme temporaire et désactiver toutes les collisions
        lightParticles.metadata = { isTemporary: true };
        
        // Zone d'émission verticale pour simuler la ligne
        lightParticles.minEmitBox = new Vector3(-0.5, -100, -0.5);
        lightParticles.maxEmitBox = new Vector3(0.5, 100, 0.5);
        
        // Couleurs cyan brillant
        lightParticles.color1 = new Color4(0, 0.8, 1, 1.0);
        lightParticles.color2 = new Color4(0.5, 1, 1, 1.0);
        lightParticles.colorDead = new Color4(0, 0.8, 1, 0);
        
        // Configuration
        lightParticles.minSize = 0.8;
        lightParticles.maxSize = 2.0;
        lightParticles.minLifeTime = 0.3;
        lightParticles.maxLifeTime = 0.8;
        lightParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Émission verticale concentrée
        lightParticles.direction1 = new Vector3(0, 1, 0);
        lightParticles.direction2 = new Vector3(0, -1, 0);
        lightParticles.minEmitPower = 2;
        lightParticles.maxEmitPower = 8;
        lightParticles.gravity = new Vector3(0, 0, 0);
        
        // Émission brève mais intense
        lightParticles.emitRate = 0;
        lightParticles.manualEmitCount = 100;
        
        // Augmenter temporairement l'intensité du glow
        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 2.5;
        }
        
        // Démarrer l'effet
        lightParticles.start();
        
        // Nettoyage rapide et sûr
        setTimeout(() => {
            lightParticles.stop();
            setTimeout(() => {
                lightParticles.dispose();
                console.log("🧹 Effet lumineux de spawn nettoyé (sans mesh)");
            }, 500);
        }, 200);
    }
    
    protected setInitialVelocity(): void { // Changé de private à protected
        // Set direction based on who scored last
        let directionX = Math.random() > 0.5 ? 1 : -1;
        if (this.lastScoredPlayer === 0) {
            directionX = 1; // Ball towards Player 1 (right)
        } else if (this.lastScoredPlayer === 1) {
            directionX = -1; // Ball towards Player 0 (left)
        }
        
        // Add random angle (max 20 degrees)
        const maxAngle = Math.PI / 9;
        const randomAngle = (Math.random() * 2 - 1) * maxAngle;
        
        this.velocity = new Vector3(
            directionX * this.options.initialSpeed * Math.cos(randomAngle),
            0,
            this.options.initialSpeed * Math.sin(randomAngle)
        );
        
        this.updateBallColor();
        
        // NOUVEAU : Notifier l'IA du début de partie avec la vraie vélocité
        if (this.controls && this.controls.ai && this.controls.ai.isAIActive()) {
            // Attendre un frame pour que la vélocité soit stable
            setTimeout(() => {
                const ballPos = this.ball.position.clone();
                const ballVel = this.velocity.clone();
                
                // Si la balle va vers l'IA (X > 0), notifier le début de partie
                if (ballVel.x > 0) {
                    this.controls!.ai!.notifyGameStart(ballPos, ballVel);
                    console.log("🎯 Notification début de partie envoyée à l'IA");
                }
            }, 16); // 1 frame à 60fps
        }
    }

    protected updateBallColor(): void {
        const currentSpeed = this.velocity.length();
        const maxSpeed = this.options.maxSpeed;
        const initialSpeed = this.options.initialSpeed;
        
        // Normalize speed between 0 and 1
        const normalizedSpeed = Math.min(1, Math.max(0, (currentSpeed - initialSpeed) / (maxSpeed - initialSpeed)));
        
        const blueColor = MAIN_COLORS.RGB_BLUE;
        const purpleColor = MAIN_COLORS.RGB_PURPLE;
        const redColor = new Color3(1, 0, 0);
        
        let ballColor;
        
        // Color transitions
        if (normalizedSpeed >= 0.999) {
            // Pure red at max speed
            ballColor = redColor;
        } else {
            // Blue to purple from initial to near-max speed
            const t = normalizedSpeed / 0.999;
            ballColor = new Color3(
                blueColor.r * (1 - t) + purpleColor.r * t,
                blueColor.g * (1 - t) + purpleColor.g * t,
                blueColor.b * (1 - t) + purpleColor.b * t
            );
        }
        
        // Apply colors - style néon renforcé
        this.ballMaterial.albedoColor = ballColor;
        this.ballMaterial.emissiveColor = new Color3(
            Math.min(1, ballColor.r * 1.5),
            Math.min(1, ballColor.g * 1.5),
            Math.min(1, ballColor.b * 1.5)
        );
        
        // Visual effects based on speed
        this.ballMaterial.emissiveIntensity = 2.0 + normalizedSpeed * 1.0;
        this.ballMaterial.roughness = 0.05 - normalizedSpeed * 0.05;
        this.ballMaterial.metallic = 0.1;
        
        // Update ONLY ball glow layer intensity
        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 0.8 + normalizedSpeed * 1.2;
        }
    }

    protected update(): void { // Changé de private à protected
        if (this.isResetting) return;
        
        // Move ball
        this.ball.position.addInPlace(this.velocity);
        
        // Update ball color based on speed
        this.updateBallColor();
        
        // Check collisions
        this.handleWallCollisions();
        this.handlePlayerCollisions();
        this.checkScoring();
    }

    protected handleWallCollisions(): void { // Changé de private à protected
        const topWallZ = this.topWall.position.z;
        const bottomWallZ = this.bottomWall.position.z;
        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        
        // Top wall collision
        if (this.ball.position.z + ballRadius >= topWallZ - this.wallCollisionThreshold && this.velocity.z > 0) {
            this.velocity.z = -this.velocity.z;
            this.ball.position.z = topWallZ - ballRadius - this.wallCollisionThreshold;
            // Animer UNIQUEMENT le mur supérieur
            this.animateWallGlow(true);
        }
        
        // Bottom wall collision
        if (this.ball.position.z - ballRadius <= bottomWallZ + this.wallCollisionThreshold && this.velocity.z < 0) {
            this.velocity.z = -this.velocity.z;
            this.ball.position.z = bottomWallZ + ballRadius + this.wallCollisionThreshold;
            // Animer UNIQUEMENT le mur inférieur
            this.animateWallGlow(false);
        }
    }

    protected handlePlayerCollisions(): void {
        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        const player0Pos = this.player0.position;
        const player1Pos = this.player1.position;
        const paddleWidth = PLAYER_CONFIG.WIDTH;
        const paddleDepth = PLAYER_CONFIG.DEPTH;

        // Player 0 (left) collision
        if (this.ball.position.x - ballRadius <= player0Pos.x + paddleWidth/2 && 
            this.ball.position.x > player0Pos.x &&
            this.velocity.x < 0 && 
            Math.abs(this.ball.position.z - player0Pos.z) < paddleDepth/2) {
            
            this.velocity.x = -this.velocity.x;
            
            // Calculate bounce angle based on hit position
            const hitPosition = (this.ball.position.z - player0Pos.z) / (paddleDepth/2);
            const maxDeflection = 0.25;
            this.velocity.z = this.velocity.length() * maxDeflection * hitPosition;
            
            this.increaseVelocity();
            
            // NOUVEAU : Notifier l'IA de la collision avec Player 0
            if (this.controls && this.controls.ai && this.controls.ai.isAIActive()) {
                // Attendre un frame pour que la nouvelle vélocité soit stable
                setTimeout(() => {
                    const ballPos = this.ball.position.clone();
                    const ballVel = this.velocity.clone();
                    this.controls!.ai!.notifyPlayer0Hit(ballPos, ballVel);
                }, 16); // 1 frame à 60fps
            }
            
            // IMPORTANT: Appeler l'animation depuis l'instance Pong
            if (this.pongInstance && this.pongInstance.animatePlayerGlow) {
                this.pongInstance.animatePlayerGlow(0);
            } else {
                // Fallback: appeler la méthode locale si elle existe
                this.animatePlayerGlow(0);
            }
        }
        
        // Player 1 (right) collision
        if (this.ball.position.x + ballRadius >= player1Pos.x - paddleWidth/2 && 
            this.ball.position.x < player1Pos.x &&
            this.velocity.x > 0 && 
            Math.abs(this.ball.position.z - player1Pos.z) < paddleDepth/2) {
            
            this.velocity.x = -this.velocity.x;
            
            // Calculate bounce angle based on hit position
            const hitPosition = (this.ball.position.z - player1Pos.z) / (paddleDepth/2);
            const maxDeflection = 0.25;
            this.velocity.z = this.velocity.length() * maxDeflection * hitPosition;
            
            this.increaseVelocity();
            
            // IMPORTANT: Appeler l'animation depuis l'instance Pong
            if (this.pongInstance && this.pongInstance.animatePlayerGlow) {
                this.pongInstance.animatePlayerGlow(1);
            } else {
                // Fallback: appeler la méthode locale si elle existe
                this.animatePlayerGlow(1);
            }
        }
    }

    protected checkScoring(): void {
        // Ajouter une variable pour éviter les déclenchements multiples
        if (this.isResetting) return;
        
        // NOUVEAU : Vérifier si on est en mode multijoueur
        const isMultiplayerMode = this.gameData.gameType === GameType.MULTIPLAYER_PONG;
        
        // Player 0 scores (balle sort à droite)
        if (this.ball.position.x > BALL_CONFIG.OUT_OF_BOUNDS_X) {
            // Marquer immédiatement comme en cours de réinitialisation pour éviter les déclenchements multiples
            this.isResetting = true;
            
            console.log(`🎯 BALLE SORTIE À DROITE ! Position: ${this.ball.position.x.toFixed(2)}`);
            
            if (isMultiplayerMode) {
                // MODE MULTIJOUEUR : Player 2 (paddle centrale) gagne quand la balle sort
                console.log("🎯 MODE MULTIJOUEUR - Player 2 (paddle centrale) gagne ! La Team a échoué");
                
                // Créer l'effet de désintégration de la balle
                this.createBallDisintegrationEffect(0); // Effet visuel côté droit
                
                // Créer l'effet de désintégration de la raquette via l'instance Pong
                if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                    this.pongInstance.createPaddleDisintegrationEffect(0);
                } else {
                    // Fallback: créer l'effet directement dans cette classe
                    this.createPaddleDisintegrationEffect(0);
                }
                
                // CORRECTION CRITIQUE : Player 2 marque (utiliser scorePlayer1)
                setTimeout(() => {
                    this.gameData.scorePlayer1(); // Player 2 = scorePlayer1 en mode multijoueur
                    this.lastScoredPlayer = 2; // Player 2 a "marqué"
                    console.log("Player 2 a marqué! Score mis à jour");
                    this.resetBallWithAnimation(true);
                }, 300);
                
            } else {
                // MODE CLASSIQUE : Player 0 marque normalement
                console.log("🎯 MODE CLASSIQUE - Player 0 marque");
                
                // Créer l'effet de désintégration de la balle
                this.createBallDisintegrationEffect(0); // Player 0 a marqué
                
                // Créer l'effet de désintégration de la raquette via l'instance Pong
                if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                    this.pongInstance.createPaddleDisintegrationEffect(0);
                } else {
                    // Fallback: créer l'effet directement dans cette classe
                    this.createPaddleDisintegrationEffect(0);
                }
                
                // Mettre à jour le score une seule fois avec un petit délai pour voir les effets
                setTimeout(() => {
                    this.gameData.scorePlayer0();
                    this.lastScoredPlayer = 0;
                    this.resetBallWithAnimation(true);
                }, 300); // Délai réduit mais suffisant pour voir l'animation
            }
        } 
        // Player 1 scores (balle sort à gauche)
        else if (this.ball.position.x < -BALL_CONFIG.OUT_OF_BOUNDS_X) {
            // Marquer immédiatement comme en cours de réinitialisation pour éviter les déclenchements multiples
            this.isResetting = true;
            
            console.log(`🎯 BALLE SORTIE À GAUCHE ! Position: ${this.ball.position.x.toFixed(2)}`);
            
            if (isMultiplayerMode) {
                // MODE MULTIJOUEUR : Player 2 (paddle centrale) gagne quand la balle sort
                console.log("🎯 MODE MULTIJOUEUR - Player 2 (paddle centrale) gagne ! La Team a échoué");
                
                // Créer l'effet de désintégration de la balle
                this.createBallDisintegrationEffect(1); // Effet visuel côté gauche
                
                // Créer l'effet de désintégration de la raquette via l'instance Pong
                if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                    this.pongInstance.createPaddleDisintegrationEffect(1);
                } else {
                    // Fallback: créer l'effet directement dans cette classe
                    this.createPaddleDisintegrationEffect(1);
                }
                
                // CORRECTION CRITIQUE : Player 2 marque (utiliser scorePlayer1)
                setTimeout(() => {
                    this.gameData.scorePlayer1(); // Player 2 = scorePlayer1 en mode multijoueur
                    this.lastScoredPlayer = 2; // Player 2 a "marqué"
                    console.log("Player 2 a marqué! Score mis à jour");
                    this.resetBallWithAnimation(true);
                }, 300);
                
            } else {
                // MODE CLASSIQUE : Player 1 marque normalement
                console.log("🎯 MODE CLASSIQUE - Player 1 marque");
                
                // Créer l'effet de désintégration de la balle
                this.createBallDisintegrationEffect(1); // Player 1 a marqué
                
                // Créer l'effet de désintégration de la raquette via l'instance Pong
                if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                    this.pongInstance.createPaddleDisintegrationEffect(1);
                } else {
                    // Fallback: créer l'effet directement dans cette classe
                    this.createPaddleDisintegrationEffect(1);
                }
                
                // Mettre à jour le score une seule fois avec un petit délai pour voir les effets
                setTimeout(() => {
                    this.gameData.scorePlayer1();
                    this.lastScoredPlayer = 1;
                    this.resetBallWithAnimation(true);
                }, 300); // Délai réduit mais suffisant pour voir l'animation
            }
        }
    }

    protected increaseVelocity(): void { // Changé de private à protected
        const currentSpeed = this.velocity.length();
        if (currentSpeed < this.options.maxSpeed) {
            const speedFactor = (currentSpeed + this.options.speedIncrement) / currentSpeed;
            this.velocity.scaleInPlace(speedFactor);
            this.updateBallColor();
        }
    }

    private animateWallGlow(isTopWall: boolean): void {
        // Sélectionner UNIQUEMENT le plan concerné (top ou bottom)
        const wallPlane = isTopWall ? this.topWallPlane : this.bottomWallPlane;
        const wallGlowLayer = isTopWall ? this.topWallGlowLayer : this.bottomWallGlowLayer;
        
        if (!wallPlane || !(wallPlane.material instanceof StandardMaterial) || !wallGlowLayer) return;
        
        // Vérifier que l'animation n'est pas déjà en cours pour CE mur spécifique
        if ((isTopWall && this.isTopWallGlowing) || (!isTopWall && this.isBottomWallGlowing)) {
            return;
        }
        
        // Marquer le début de l'animation UNIQUEMENT pour le mur concerné
        if (isTopWall) {
            this.isTopWallGlowing = true;
        } else {
            this.isBottomWallGlowing = true;
        }
        
        // Sauvegarder l'intensité d'origine du wallGlowLayer spécifique
        const originalGlowIntensity = wallGlowLayer.intensity;
        
        // Sauvegarder l'état original du matériau
        const material = wallPlane.material as StandardMaterial;
        const originalEmissiveColor = material.emissiveColor ? material.emissiveColor.clone() : new Color3(0.7, 0.7, 0.7);
        
        // Animation de glow (blanc brillant)
        material.emissiveColor = new Color3(1, 1, 1);
        
        // Augmenter l'intensité UNIQUEMENT pour ce mur spécifique
        wallGlowLayer.intensity = 2.0;
        
        // Créer un effet de particules à l'impact
        this.createImpactParticles(isTopWall);
        
        // Animation de décroissance de la lueur
        const startTime = performance.now();
        const animate = () => {
            const elapsedTime = performance.now() - startTime;
            const progress = Math.min(elapsedTime / this.wallGlowAnimationDuration, 1);
            
            if (progress < 1) {
                // Calculer la couleur d'émission intermédiaire (blanc vers couleur originale)
                const currentEmissive = new Color3(
                    1 - progress * (1 - originalEmissiveColor.r),
                    1 - progress * (1 - originalEmissiveColor.g),
                    1 - progress * (1 - originalEmissiveColor.b)
                );
                
                // Appliquer la couleur UNIQUEMENT au mur concerné
                material.emissiveColor = currentEmissive;
                
                // Réduire progressivement l'intensité du glow
                wallGlowLayer.intensity = 2.0 - (progress * (2.0 - originalGlowIntensity));
                
                requestAnimationFrame(animate);
            } else {
                // Restaurer la couleur d'émission originale
                material.emissiveColor = originalEmissiveColor;
                
                // Restaurer l'intensité d'origine du glow
                wallGlowLayer.intensity = originalGlowIntensity;
                
                // Marquer la fin de l'animation UNIQUEMENT pour le mur concerné
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
        
        // Créer un système de particules temporaire
        const impactParticles = new ParticleSystem("impactParticles", 50, this.scene);
        
        // Position de l'émetteur au point d'impact
        const emitterPosition = new Vector3(
            this.ball.position.x,
            this.ball.position.y,
            wall.position.z
        );
        impactParticles.emitter = emitterPosition;
        
        // Texture des particules (cercle lumineux)
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        impactParticles.particleTexture = particleTexture;
        
        // Couleurs des particules selon le mur (bleu ou violet) - en utilisant Color4 correctement
        const color = isTopWall ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        impactParticles.color1 = new Color4(color.r, color.g, color.b, 1.0);
        impactParticles.color2 = new Color4(color.r, color.g, color.b, 1.0);
        impactParticles.colorDead = new Color4(color.r, color.g, color.b, 0.0);
        
        // Configuration des particules
        impactParticles.minSize = 0.5;
        impactParticles.maxSize = 1.5;
        impactParticles.minLifeTime = 0.2;
        impactParticles.maxLifeTime = 0.4;
        impactParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Direction (horizontale uniquement)
        impactParticles.minEmitBox = new Vector3(-5, -1, 0);
        impactParticles.maxEmitBox = new Vector3(5, 1, 0);
        impactParticles.direction1 = new Vector3(5, 0, 0);
        impactParticles.direction2 = new Vector3(-5, 0, 0);
        
        // Émission
        impactParticles.emitRate = 0;
        impactParticles.manualEmitCount = 50;
        impactParticles.gravity = new Vector3(0, 0, 0);
        
        // Démarrer les particules
        impactParticles.start();
        
        // Arrêter et disposer du système après l'animation
        setTimeout(() => {
            impactParticles.stop();
            setTimeout(() => {
                impactParticles.dispose();
            }, 500);
        }, 100);
    }

    private animatePlayerGlow(playerIndex: number): void {
        // Déterminer le joueur et son GlowLayer
        const player = playerIndex === 0 ? this.player0 : this.player1;
        const playerGlowLayer = playerIndex === 0 ? this.player0GlowLayer : this.player1GlowLayer;
        const isGlowing = playerIndex === 0 ? this.isPlayer0Glowing : this.isPlayer1Glowing;
        
        // Vérifier si le joueur existe et s'il n'est pas déjà en train de briller
        if (!player || !playerGlowLayer || !(player.material instanceof StandardMaterial) || isGlowing) {
            return;
        }
        
        // Marquer le début de l'animation
        if (playerIndex === 0) {
            this.isPlayer0Glowing = true;
        } else {
            this.isPlayer1Glowing = true;
        }
        
        // Sauvegarder l'intensité originale et la couleur d'émission
        const originalGlowIntensity = playerGlowLayer.intensity;
        const material = player.material as StandardMaterial;
        const originalEmissiveColor = material.emissiveColor ? material.emissiveColor.clone() : 
            playerIndex === 0 ? MAIN_COLORS.RGB_BLUE.scale(0.5) : MAIN_COLORS.RGB_PURPLE.scale(0.5);
        
        // Augmenter la brillance
        material.emissiveColor = new Color3(1, 1, 1); // Blanc brillant
        playerGlowLayer.intensity = 2.0;
        
        // Créer des particules à l'impact
        this.createPlayerImpactParticles(playerIndex);
        
        // Animation de décroissance de la lueur
        const startTime = performance.now();
        const animate = () => {
            const elapsedTime = performance.now() - startTime;
            const progress = Math.min(elapsedTime / this.playerGlowAnimationDuration, 1);
            
            if (progress < 1) {
                // Couleur d'émission intermédiaire
                const currentEmissive = new Color3(
                    1 - progress * (1 - originalEmissiveColor.r),
                    1 - progress * (1 - originalEmissiveColor.g),
                    1 - progress * (1 - originalEmissiveColor.b)
                );
                
                // Appliquer la couleur et l'intensité
                material.emissiveColor = currentEmissive;
                playerGlowLayer.intensity = 2.0 - (progress * (2.0 - originalGlowIntensity));
                
                requestAnimationFrame(animate);
            } else {
                // Restaurer les valeurs originales
                material.emissiveColor = originalEmissiveColor;
                playerGlowLayer.intensity = originalGlowIntensity;
                
                // Marquer la fin de l'animation
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
        
        // Créer un système de particules temporaire
        const impactParticles = new ParticleSystem("playerImpactParticles", 50, this.scene);
        
        // Position de l'émetteur au point d'impact
        const emitterPosition = new Vector3(
            player.position.x,
            player.position.y,
            this.ball.position.z
        );
        impactParticles.emitter = emitterPosition;
        
        // Texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        impactParticles.particleTexture = particleTexture;
        
        // Couleurs des particules selon le joueur
        const color = playerIndex === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        impactParticles.color1 = new Color4(color.r, color.g, color.b, 1.0);
        impactParticles.color2 = new Color4(color.r, color.g, color.b, 1.0);
        impactParticles.colorDead = new Color4(color.r, color.g, color.b, 0.0);
        
        // Configuration des particules
        impactParticles.minSize = 0.5;
        impactParticles.maxSize = 1.5;
        impactParticles.minLifeTime = 0.2;
        impactParticles.maxLifeTime = 0.4;
        impactParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Direction (émission horizontale depuis le joueur)
        const directionX = playerIndex === 0 ? 1 : -1; // Vers la droite pour joueur 0, vers la gauche pour joueur 1
        impactParticles.direction1 = new Vector3(directionX * 5, 0, 1);
        impactParticles.direction2 = new Vector3(directionX * 5, 0, -1);
        
        // Émission
        impactParticles.emitRate = 0;
        impactParticles.manualEmitCount = 50;
        impactParticles.gravity = new Vector3(0, 0, 0);
        
        // Démarrer les particules
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
        
        // Obtenir la position actuelle de la balle
        const ballPosition = this.ball.position.clone();
        
        // Créer un système de particules optimisé
        const particleCount = Math.floor(240 * this.particleReductionFactor); // Réduit selon le facteur
        const fastParticles = new ParticleSystem("fastBallParticles", particleCount, this.scene);
        
        // Définir la texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        fastParticles.particleTexture = particleTexture;
        
        // Positionner l'émetteur à la position actuelle de la balle
        fastParticles.emitter = ballPosition;
        
        // Zone d'émission COMPACTE pour un départ groupé
        fastParticles.minEmitBox = new Vector3(-0.4, -0.4, -0.4); // Réduit
        fastParticles.maxEmitBox = new Vector3(0.4, 0.4, 0.4);    // Réduit
        
        // Couleurs des particules basées sur le joueur qui a marqué - ULTRA BRILLANTES
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
        
        // Taille des particules - légèrement réduite
        fastParticles.minSize = 1.5; // Réduit de 2.0
        fastParticles.maxSize = 4.5; // Réduit de 6.0
        
        // Durée de vie RÉDUITE
        fastParticles.minLifeTime = 1.0; // Réduit de 1.5
        fastParticles.maxLifeTime = 2.0; // Réduit de 3.0
        
        // Direction EXACTEMENT dans le sens de la vélocité de la balle
        const velocityDirection = this.velocity.normalize();
        
        // Les particules partent dans la direction de la vélocité - VITESSE OPTIMISÉE
        const baseSpeed = 100; // Réduit de 120
        const dispersionAngle = Math.PI / 12; // Dispersion de 15 degrés seulement
        
        // Calculer les directions avec légère dispersion
        const perpendicular1 = new Vector3(-velocityDirection.z, 0, velocityDirection.x).normalize();
        const perpendicular2 = Vector3.Cross(velocityDirection, perpendicular1).normalize();
        
        // Direction principale avec légère variation
        const mainDirection = velocityDirection.scale(baseSpeed);
        const dispersionRadius = 8; // Légèrement réduit
        
        fastParticles.direction1 = mainDirection.add(perpendicular1.scale(-dispersionRadius)).add(perpendicular2.scale(-dispersionRadius));
        fastParticles.direction2 = mainDirection.add(perpendicular1.scale(dispersionRadius)).add(perpendicular2.scale(dispersionRadius));
        
        // Puissance d'émission optimisée
        fastParticles.minEmitPower = 80; // Réduit de 100
        fastParticles.maxEmitPower = 130; // Réduit de 160
        
        // Mode additif pour l'effet lumineux maximum
        fastParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Utiliser un émetteur conique pointant dans la direction de la vélocité
        fastParticles.createConeEmitter(1.2, dispersionAngle); // Réduit de 1.5
        
        // Rotation des particules
        fastParticles.minAngularSpeed = -3.0; // Réduit de -4.0
        fastParticles.maxAngularSpeed = 3.0;  // Réduit de 4.0
        
        // Quantité de particules RÉDUITE
        const manualEmitCount = Math.floor(180 * this.particleReductionFactor);
        fastParticles.emitRate = 0;
        fastParticles.manualEmitCount = manualEmitCount;
        
        // Gradients pour maintenir la vitesse dans la direction - optimisés
        fastParticles.addVelocityGradient(0, 5.0);   // Réduit de 6.0
        fastParticles.addVelocityGradient(0.2, 4.5); // Réduit de 5.7
        fastParticles.addVelocityGradient(0.5, 4.0); // Réduit de 5.25
        fastParticles.addVelocityGradient(0.8, 3.5); // Réduit de 4.5
        fastParticles.addVelocityGradient(1.0, 3.0); // Réduit de 3.75
        
        // Pas de gravité pour garder la direction
        fastParticles.gravity = new Vector3(0, 0, 0);
        
        // Rendre la balle invisible immédiatement
        this.ball.isVisible = false;
        
        // Démarrer les particules
        fastParticles.start();
        
        // Nettoyer après optimisé
        setTimeout(() => {
            fastParticles.stop();
            
            // Nettoyer les ressources plus rapidement
            setTimeout(() => {
                fastParticles.dispose();
            }, 2000); // Réduit de 3000
        }, 250); // Légèrement réduit
    }

    private createPaddleDisintegrationEffect(playerScored: number): void {
        console.log(`Création de l'effet de désintégration de la raquette - joueur marqué: ${playerScored} (VERSION SANS SHOCKWAVE)`);
        
        // Déterminer quelle raquette se désintègre (celle qui n'a pas marqué)
        const paddleToDisintegrate = playerScored === 0 ? this.player1 : this.player0;
        const paddleColor = playerScored === 0 ? MAIN_COLORS.RGB_PURPLE : MAIN_COLORS.RGB_BLUE;
        
        // Obtenir la position de la raquette
        const paddlePosition = paddleToDisintegrate.position.clone();
        
        // Créer un système de particules pour la raquette - AUGMENTÉ DE 30%
        const paddleParticles = new ParticleSystem("paddleDisintegrationParticles", 390, this.scene); // 300 * 1.3 = 390
        
        // Texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        paddleParticles.particleTexture = particleTexture;
        
        // Positionner l'émetteur à la position de la raquette
        paddleParticles.emitter = paddlePosition;
        
        // Zone d'émission adaptée à la forme de la raquette - TAILLE ORIGINALE
        paddleParticles.minEmitBox = new Vector3(-3, -3, -25);  // TAILLE ORIGINALE AGRANDIE
        paddleParticles.maxEmitBox = new Vector3(3, 3, 25);    // TAILLE ORIGINALE AGRANDIE
        
        // Couleurs des particules basées sur la couleur de la raquette - LUMINOSITÉ AUGMENTÉE DRASTIQUEMENT
        paddleParticles.color1 = new Color4(
            Math.min(1, paddleColor.r * 4.0),  // AUGMENTÉ DE 2.5 à 4.0 pour plus de luminosité
            Math.min(1, paddleColor.g * 4.0),
            Math.min(1, paddleColor.b * 4.0),
            1.0
        );
        paddleParticles.color2 = new Color4(1.0, 1.0, 1.0, 1.0);  // BLANC PUR ULTRA BRILLANT
        paddleParticles.colorDead = new Color4(
            Math.min(1, paddleColor.r * 2.0),  // AUGMENTÉ même pour la couleur finale
            Math.min(1, paddleColor.g * 2.0),
            Math.min(1, paddleColor.b * 2.0),
            0
        );
        
        // Taille des particules - TAILLE AUGMENTÉE pour plus de visibilité
        paddleParticles.minSize = 1.2;  // AUGMENTÉ de 1.0 à 1.2
        paddleParticles.maxSize = 3.5;  // AUGMENTÉ de 3.0 à 3.5
        
        // Durée de vie originale généreuse
        paddleParticles.minLifeTime = 1.0;  // DURÉE ORIGINALE
        paddleParticles.maxLifeTime = 2.0;  // DURÉE ORIGINALE
        
        // Direction d'émission vers l'extérieur - VITESSE RÉDUITE DE 20%
        const directionX = playerScored === 0 ? 1 : -1;
        paddleParticles.direction1 = new Vector3(directionX * 32, -12, -16);  // 40 * 0.8 = 32, 15 * 0.8 = 12, 20 * 0.8 = 16
        paddleParticles.direction2 = new Vector3(directionX * 32, 12, 16);    // VITESSE RÉDUITE DE 20%
        
        // Puissance d'émission réduite de 20%
        paddleParticles.minEmitPower = 24;  // 30 * 0.8 = 24
        paddleParticles.maxEmitPower = 48;  // 60 * 0.8 = 48
        
        // Mode additif pour maximum de luminosité
        paddleParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Émetteur en forme de boîte avec dimensions originales
        paddleParticles.createBoxEmitter(
            new Vector3(directionX, 0, 0),
            new Vector3(directionX, 0, 0),
            new Vector3(-3, -3, -25),    // TAILLE ORIGINALE
            new Vector3(3, 3, 25)       // TAILLE ORIGINALE
        );
        
        // Rotation des particules originale
        paddleParticles.minAngularSpeed = -3.0;  // ROTATION ORIGINALE
        paddleParticles.maxAngularSpeed = 3.0;   // ROTATION ORIGINALE
        
        // Quantité de particules augmentée de 30%
        paddleParticles.emitRate = 0;
        paddleParticles.manualEmitCount = 325;  // 250 * 1.3 = 325
        
        // Gravité légère vers le bas
        paddleParticles.gravity = new Vector3(0, -8, 0);  // GRAVITÉ ORIGINALE
        
        // Rendre la raquette temporairement transparente
        const originalAlpha = (paddleToDisintegrate.material as StandardMaterial).alpha || 1.0;
        (paddleToDisintegrate.material as StandardMaterial).alpha = 0.2;  // PLUS TRANSPARENT
        
        // Démarrer les particules
        paddleParticles.start();
        
        // SUPPRIMER COMPLÈTEMENT L'EFFET DE SHOCKWAVE - ne pas appeler createOriginalPaddleShockwave
        
        // Nettoyer et restaurer la raquette après l'animation - TIMING ORIGINAL
        setTimeout(() => {
            paddleParticles.stop();
            
            // Restaurer la visibilité de la raquette
            (paddleToDisintegrate.material as StandardMaterial).alpha = originalAlpha;
            
            setTimeout(() => {
                paddleParticles.dispose();
            }, 3000); // TEMPS ORIGINAL LONG
        }, 500); // TEMPS ORIGINAL
    }
}