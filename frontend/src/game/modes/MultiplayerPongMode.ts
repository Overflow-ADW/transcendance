import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Vector3, GlowLayer, ParticleSystem, Texture, Color4, PBRMaterial } from "@babylonjs/core";
import { IPongGameMode } from "./DefaultPongMode";
import { GameType, GameState, GameEvents } from "@/game/utils/pongData";
import { PongData } from "@/game/utils/pongData";
import { PongControls } from "@/game/utils/pongControls";
import { getGameModeConfig, PLAYER_CONFIG, MAIN_COLORS, BALL_CONFIG, WALL_CONFIG } from "@/game/utils/pongValues";
import { PongBall, BallOptions, GlowLayerOptions } from "@/game/utils/pongGame";

/**
 * MultiplayerPongMode
 *
 * Mode de jeu à 3 joueurs :
 * - Player 0 et Player 1 sont en équipe (Team)
 * - Player 2 (paddle verte au centre) est seul
 * - La Team gagne 1 point en touchant Player 2
 * - Player 2 gagne 1 point quand la balle sort des limites (goal pour Team)
 * - Premier à 3 points gagne
 */
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
    
    // NOUVEAU : Système de croissance de la paddle centrale
    private centerPaddleBaseDepth = PLAYER_CONFIG.DEPTH; // 90 de base
    private centerPaddleCurrentDepth = PLAYER_CONFIG.DEPTH;
    private centerPaddleGrowthRate = 2; // Augmentation de 2 par coup
    
    // CORRECTION : Utiliser la propriété héritée au lieu de redéclarer
    // private velocityAlreadySet = false; // SUPPRIMÉ - utiliser celle de la classe parent
    private lastVelocitySetTime = 0; // Seulement cette propriété est spécifique au mode multiplayer

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
        // Appeler le constructeur parent avec tous les paramètres
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

        // CORRECTION CRITIQUE : Désactiver TOUTES les collisions automatiques
        this.disableAllAutomaticCollisions();

        console.log("✅ MultiplayerPongBall créé - Collisions automatiques complètement désactivées");
    }

    private setupMultiplayerEventListeners(): void {
        this.gameData.on(GameEvents.SCORE_CHANGED, () => {
            console.log("📊 Score changé - reset paddle centrale");
            this.centerPaddleAppeared = false;
            this.centerPaddleHit = false; // Reset du flag
            
            // NOUVEAU : Réinitialiser la taille de la paddle centrale
            this.resetCenterPaddleSize();
            
            if (this.centerPaddle) {
                this.centerPaddle.isVisible = false;
            }
            this.lastGoalTime = performance.now();
        });
    }

    // Override setInitialVelocity : La balle part vers Player 0 ou Player 1 uniquement
    protected setInitialVelocity(): void {
        // CORRECTION MAJEURE : Éviter les appels multiples avec une vérification plus stricte
        const currentTime = performance.now();
        
        // Si on a déjà défini la vélocité récemment (dans les 500ms), ignorer
        if (this.lastVelocitySetTime && (currentTime - this.lastVelocitySetTime) < 500) {
            console.log("⚠️ MultiplayerPongBall - setInitialVelocity appelé trop récemment - ignorer");
            return;
        }
        
        // Si on est en cours de reset, attendre
        if (this.isResetting) {
            console.log("⚠️ MultiplayerPongBall - Jeu en cours de reset - ignorer setInitialVelocity");
            return;
        }
        
        console.log("🚀 EXECUTION setInitialVelocity - Mode Multijoueur");
        
        // Marquer immédiatement pour éviter les appels multiples
        this.lastVelocitySetTime = currentTime;
        this.velocityAlreadySet = true;
        
        // Logique spécifique au mode multijoueur - plus simple
        const maxAngle = Math.PI / 12; // Angle réduit pour plus de prévisibilité
        const randomAngle = (Math.random() * 2 - 1) * maxAngle;
        
        let directionX = Math.random() > 0.5 ? 1 : -1;
        if (this.lastScoredPlayer === 0) {
            directionX = 1; // Vers Player 1
            console.log("🎯 Mode Multijoueur - Balle vers Player 1 (droite)");
        } else if (this.lastScoredPlayer === 1) {
            directionX = -1; // Vers Player 0
            console.log("🎯 Mode Multijoueur - Balle vers Player 0 (gauche)");
        } else {
            console.log("🎯 Mode Multijoueur - Direction aléatoire:", directionX > 0 ? "droite" : "gauche");
        }
        
        // Créer la vélocité avec des valeurs fixes
        this.velocity = new Vector3(
            directionX * this.options.initialSpeed,
            0,
            this.options.initialSpeed * Math.sin(randomAngle) * 0.3
        );
        
        console.log(`🎯 Vélocité définie: X=${this.velocity.x.toFixed(2)}, Z=${this.velocity.z.toFixed(2)}, Speed=${this.velocity.length().toFixed(2)}`);
        
        // Marquer le temps de lancement pour la logique de la paddle centrale
        this.ballLaunchTime = performance.now();
        this.centerPaddleHit = false;
        
        // Mettre à jour la couleur de la balle
        this.updateBallColor();
        
        // Notifier l'IA si nécessaire
        if (this.controls && this.controls.ai && this.controls.ai.isAIActive()) {
            setTimeout(() => {
                const ballPos = this.ball.position.clone();
                const ballVel = this.velocity.clone();
                
                if (ballVel.x > 0) {
                    this.controls!.ai!.notifyGameStart(ballPos, ballVel);
                    console.log("🎯 Notification IA envoyée");
                }
            }, 16);
        }
    }

    // Override resetBallWithAnimation pour gérer les paddles correctement
    protected resetBallWithAnimation(isGoal = false): void {
        if (this.gameData.gameState === GameState.GAME_OVER) {
            return;
        }
        
        console.log("🔄 Reset de la balle - version multijoueur");
        
        // NOUVEAU : Réinitialiser les flags de vélocité au début du reset
        this.velocityAlreadySet = false;
        this.lastVelocitySetTime = 0;
        
        // CORRECTION 2: Réinitialiser tous les glows
        this.resetAllGlows();
        
        // Masquer et réinitialiser la paddle centrale
        if (this.centerPaddle) {
            this.centerPaddle.isVisible = false;
            console.log("🚫 Paddle centrale masquée");
        }
        
        this.centerPaddleAppeared = false;
        this.centerPaddleHit = false;
        this.lastGoalTime = performance.now();
        this.lastCollisionTime = 0;
        this.ballLaunchTime = 0;
        
        // Repositionner TOUTES les paddles au centre Z
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
        
        // CORRECTION MAJEURE : Repositionner aussi la paddle centrale
        if (this.centerPaddle) {
            this.centerPaddle.position = new Vector3(
                0, // Au centre horizontalement
                PLAYER_CONFIG.POSITION_Y,
                PLAYER_CONFIG.INITIAL_POSITION_Z
            );
        }
        
        this.isResetting = true;
        
        // Pause ball movement during reset
        if (this.controls) {
            this.controls.setControlsLocked(true);
        }
        
        // Set final ball position
        const targetPosition = new Vector3(
            BALL_CONFIG.INITIAL_POSITION.X, 
            BALL_CONFIG.INITIAL_POSITION.Y, 
            BALL_CONFIG.INITIAL_POSITION.Z
        );
        this.ball.position = targetPosition;
        
        // Réinitialiser les couleurs de la balle
        this.ballMaterial.albedoColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveColor = MAIN_COLORS.RGB_BLUE;
        this.ballMaterial.emissiveIntensity = 2.0;
        
        if (this.ballGlowLayer) {
            this.ballGlowLayer.intensity = 1.0;
        }
        
        // CORRECTION MAJEURE : Simplifier et corriger la logique des timeouts
        if (isGoal) {
            setTimeout(() => {
                console.log("🎬 Démarrage effet Tron (mode goal)");
                this.createTronSpawnEffect();
                
                setTimeout(() => {
                    console.log("🚀 Appel setInitialVelocity (mode goal)");
                    this.setInitialVelocity();
                    this.isResetting = false;
                    
                    // CORRECTION CRITIQUE : Déverrouiller les contrôles pour TOUS les joueurs
                    if (this.controls) {
                        this.controls.setControlsLocked(false);
                        console.log("🔓 Contrôles déverrouillés pour tous les joueurs");
                    }
                }, 1500);
            }, 500);
        } else {
            setTimeout(() => {
                console.log("🎬 Démarrage effet Tron (mode normal)");
                this.createTronSpawnEffect();
                
                setTimeout(() => {
                    console.log("🚀 Appel setInitialVelocity (mode normal)");
                    this.setInitialVelocity();
                    this.isResetting = false;
                    
                    // CORRECTION CRITIQUE : Déverrouiller les contrôles pour TOUS les joueurs
                    if (this.controls) {
                        this.controls.setControlsLocked(false);
                        console.log("🔓 Contrôles déverrouillés pour tous les joueurs");
                    }
                }, 800);
            }, 200);
        }
    }

    // Override update pour ajouter la logique de la paddle centrale
    protected update(): void {
        if (this.isResetting) return;
        
        // NOUVEAU : S'assurer que ballLaunchTime est défini dès que la balle bouge
        if (this.ballLaunchTime === 0 && this.velocity.length() > 0.1 && this.ball.isVisible) {
            this.ballLaunchTime = performance.now();
            console.log("🎯 ballLaunchTime initialisé dans update() - balle en mouvement détectée");
        }
        
        // CORRECTION : Maintenant on peut appeler super.update() car checkScoring() gère le mode multijoueur
        super.update();
        
        // Ajouter SEULEMENT la logique spécifique au multijoueur :
        
        // 6. Logique de la paddle centrale
        if (!this.isResetting && this.ball.isVisible) {
            this.handleCenterPaddleLogic();
        }
        
        // 7. Logique de collision avec la paddle centrale
        if (!this.isResetting && this.ball.isVisible && !this.centerPaddleHit) {
            this.handleCenterPaddleCollision();
        }
    }

    // NOUVELLE MÉTHODE : Collision des joueurs SANS le scoring du parent
    private handlePlayerCollisionsWithoutScoring(): void {
        // Ne pas traiter les collisions si la paddle centrale a été touchée
        if (this.centerPaddleHit) return;
        
        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        const ballPos = this.ball.position;
        
        // Copier la logique de collision du parent MAIS SANS LE SCORING
        const player0Pos = this.player0.position;
        const player1Pos = this.player1.position;
        
        const paddleHalfWidth = PLAYER_CONFIG.WIDTH / 2;
        const paddleHalfHeight = PLAYER_CONFIG.HEIGHT / 2;
        const paddleHalfDepth = PLAYER_CONFIG.DEPTH / 2;
        
        // Collision Player 0
        if (Math.abs(ballPos.x - player0Pos.x) <= paddleHalfWidth + ballRadius &&
            Math.abs(ballPos.y - player0Pos.y) <= paddleHalfHeight + ballRadius &&
            Math.abs(ballPos.z - player0Pos.z) <= paddleHalfDepth + ballRadius &&
            this.velocity.x < 0) { // Ball moving towards player 0
            
            console.log("🔵 Collision avec Player 0 en mode multiplayer");
            
            // Réflexion de la balle
            this.velocity.x = Math.abs(this.velocity.x);
            
            // Ajuster la position pour éviter les collisions multiples
            this.ball.position.x = player0Pos.x + paddleHalfWidth + ballRadius + 1;
            
            // Faire grandir la paddle centrale si elle est visible
            if (this.centerPaddle && this.centerPaddleAppeared) {
                this.growCenterPaddle();
            }
        }
        
        // Collision Player 1
        if (Math.abs(ballPos.x - player1Pos.x) <= paddleHalfWidth + ballRadius &&
            Math.abs(ballPos.y - player1Pos.y) <= paddleHalfHeight + ballRadius &&
            Math.abs(ballPos.z - player1Pos.z) <= paddleHalfDepth + ballRadius &&
            this.velocity.x > 0) { // Ball moving towards player 1
            
            console.log("🟣 Collision avec Player 1 en mode multiplayer");
            
            // Réflexion de la balle
            this.velocity.x = -Math.abs(this.velocity.x);
            
            // Ajuster la position pour éviter les collisions multiples
            this.ball.position.x = player1Pos.x - paddleHalfWidth - ballRadius - 1;
            
            // Faire grandir la paddle centrale si elle est visible
            if (this.centerPaddle && this.centerPaddleAppeared) {
                this.growCenterPaddle();
            }
        }
    }

    // NOUVELLE MÉTHODE : Faire grandir la paddle centrale
    private growCenterPaddle(): void {
        if (!this.centerPaddle) return;
        
        // Augmenter la profondeur
        this.centerPaddleCurrentDepth += this.centerPaddleGrowthRate;
        
        // Recréer la géométrie de la paddle avec la nouvelle taille
        const newPaddleGeometry = MeshBuilder.CreateBox("centerPaddleNew", {
            width: PLAYER_CONFIG.WIDTH,
            height: PLAYER_CONFIG.HEIGHT,
            depth: this.centerPaddleCurrentDepth
        }, this.scene);
        
        // Copier les propriétés de l'ancienne paddle
        newPaddleGeometry.position = this.centerPaddle.position.clone();
        newPaddleGeometry.material = this.centerPaddle.material;
        newPaddleGeometry.isVisible = this.centerPaddle.isVisible;
        newPaddleGeometry.checkCollisions = false;
        newPaddleGeometry.isPickable = false;
        newPaddleGeometry.doNotSyncBoundingInfo = true;
        
        // Remplacer l'ancienne paddle
        const oldPaddle = this.centerPaddle;
        this.centerPaddle = newPaddleGeometry;
        
        // Disposer de l'ancienne paddle
        oldPaddle.dispose();
        
        // Mettre à jour les contrôles avec la nouvelle paddle
        if (this.controls && this.controls.hasPlayer2()) {
            this.controls.setPlayer2(this.centerPaddle);
        }
        
        // Créer un effet visuel de croissance
        this.createCenterPaddleGrowthEffect();
        
        console.log(`🌱 Paddle centrale grandit ! Nouvelle profondeur: ${this.centerPaddleCurrentDepth} (était ${this.centerPaddleCurrentDepth - this.centerPaddleGrowthRate})`);
    }
    
    // NOUVELLE MÉTHODE : Réinitialiser la taille de la paddle centrale
    private resetCenterPaddleSize(): void {
        if (!this.centerPaddle) return;
        
        console.log(`🔄 Réinitialisation de la paddle centrale à sa taille de base (${this.centerPaddleBaseDepth})`);
        
        // Réinitialiser la profondeur actuelle
        this.centerPaddleCurrentDepth = this.centerPaddleBaseDepth;
        
        // Recréer la paddle à sa taille de base
        const resetPaddleGeometry = MeshBuilder.CreateBox("centerPaddleReset", {
            width: PLAYER_CONFIG.WIDTH,
            height: PLAYER_CONFIG.HEIGHT,
            depth: this.centerPaddleBaseDepth
        }, this.scene);
        
        // Copier les propriétés
        resetPaddleGeometry.position = this.centerPaddle.position.clone();
        resetPaddleGeometry.material = this.centerPaddle.material;
        resetPaddleGeometry.isVisible = false; // Sera rendue visible plus tard
        resetPaddleGeometry.checkCollisions = false;
        resetPaddleGeometry.isPickable = false;
        resetPaddleGeometry.doNotSyncBoundingInfo = true;
        
        // Remplacer l'ancienne paddle
        const oldPaddle = this.centerPaddle;
        this.centerPaddle = resetPaddleGeometry;
        
        console.log(`✅ Paddle centrale réinitialisée à la profondeur ${this.centerPaddleBaseDepth}`);
    }
    
    // NOUVELLE MÉTHODE : Effet visuel de croissance
    private createCenterPaddleGrowthEffect(): void {
        if (!this.centerPaddle) return;

        const growthParticles = new ParticleSystem("centerPaddleGrowth", 40, this.scene);
        
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        growthParticles.particleTexture = particleTexture;
        
        growthParticles.emitter = this.centerPaddle.position.clone();
        
        // Zone d'émission élargie pour montrer la croissance
        growthParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH/2, -PLAYER_CONFIG.HEIGHT/2, -this.centerPaddleCurrentDepth/2);
        growthParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH/2, PLAYER_CONFIG.HEIGHT/2, this.centerPaddleCurrentDepth/2);
        
        // Couleurs vertes brillantes pour indiquer la croissance
        growthParticles.color1 = new Color4(
            Math.min(1, MAIN_COLORS.RGB_GREEN.r * 2.0),
            Math.min(1, MAIN_COLORS.RGB_GREEN.g * 2.0),
            Math.min(1, MAIN_COLORS.RGB_GREEN.b * 2.0),
            1.0
        );
        growthParticles.color2 = new Color4(0.5, 1, 0.5, 1.0); // Vert plus clair
        growthParticles.colorDead = new Color4(MAIN_COLORS.RGB_GREEN.r, MAIN_COLORS.RGB_GREEN.g, MAIN_COLORS.RGB_GREEN.b, 0);

        growthParticles.minSize = 0.2;
        growthParticles.maxSize = 0.8;
        growthParticles.minLifeTime = 0.3;
        growthParticles.maxLifeTime = 0.6;
        growthParticles.minEmitPower = 1;
        growthParticles.maxEmitPower = 3;

        // Émission vers l'extérieur pour montrer l'expansion
        growthParticles.createSphereEmitter(0.5);
        growthParticles.emitRate = 0;
        growthParticles.manualEmitCount = 30;
        growthParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        growthParticles.gravity = new Vector3(0, 0, 0);

        growthParticles.start();

        // Flash temporaire de la paddle
        const material = this.centerPaddle.material as StandardMaterial;
        if (material) {
            const originalEmissive = material.emissiveColor.clone();
            
            // Flash vert super brillant
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

    // CORRECTION 2: Nouvelle méthode pour réinitialiser tous les glows
    private resetAllGlows(): void {
        // Reset player glows
        if (this.player0GlowLayer && this.player0.material instanceof StandardMaterial) {
            this.player0GlowLayer.intensity = 0.8;
            this.player0.material.emissiveColor = MAIN_COLORS.RGB_BLUE.scale(0.5);
        }
        
        if (this.player1GlowLayer && this.player1.material instanceof StandardMaterial) {
            this.player1GlowLayer.intensity = 0.8;
            this.player1.material.emissiveColor = MAIN_COLORS.RGB_PURPLE.scale(0.5);
        }
        
        // Reset wall glows
        if (this.topWallGlowLayer) {
            this.topWallGlowLayer.intensity = 0.8;
        }
        
        if (this.bottomWallGlowLayer) {
            this.bottomWallGlowLayer.intensity = 0.8;
        }
        
        // Reset center paddle glow
        if (this.centerPaddle && this.centerPaddle.material instanceof StandardMaterial) {
            this.centerPaddle.material.emissiveColor = MAIN_COLORS.RGB_GREEN.scale(0.5);
        }
        
        console.log("🔄 Tous les glows réinitialisés");
    }

    private handleCenterPaddleLogic(): void {
        if (!this.centerPaddleAppeared && !this.isResetting && this.centerPaddle) {
            const currentTime = performance.now();
            const timeSinceBallLaunch = currentTime - this.ballLaunchTime;
            const velocityLength = this.velocity.length();
            
            // CORRECTION : Conditions beaucoup plus permissives pour faire apparaître la paddle
            const hasValidVelocity = velocityLength > 0.1; // Très faible seuil
            const hasValidLaunchTime = this.ballLaunchTime > 0 && timeSinceBallLaunch > 100; // Très court délai
            const ballIsMoving = this.ball.isVisible && !this.isResetting;
            
            // Debug simplifié - une seule fois
            if (velocityLength > 0) {
                console.log(`🔍 Center Paddle Check - Speed: ${velocityLength.toFixed(2)}, Time: ${timeSinceBallLaunch}ms, Visible: ${this.ball.isVisible}`);
            }
            
            // Faire apparaître la paddle dès que possible
            if (ballIsMoving && (hasValidVelocity || hasValidLaunchTime || timeSinceBallLaunch > 500)) {
                console.log(`✅ Paddle centrale apparaît maintenant!`);
                this.makeCenterPaddleAppear();
            }
        }
    }

    private makeCenterPaddleAppear(): void {
        if (!this.centerPaddle || this.centerPaddleAppeared) return;
        
        console.log("🌟 Apparition de la paddle centrale verte!");
        this.centerPaddleAppeared = true;
        
        // Rendre visible
        this.centerPaddle.isVisible = true;
        
        // Créer un effet d'apparition
        this.createCenterPaddleAppearanceEffect();
        
        // Animation d'apparition
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
                console.log("✅ Paddle centrale entièrement apparue!");
            }
        };
        
        requestAnimationFrame(animateAppearance);
    }

    // CORRECTION 4: Collision avec paddle centrale : La Team marque IMMÉDIATEMENT et gagne la partie
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
        
        // Vérifier collision précise avec la paddle centrale
        if (Math.abs(this.ball.position.x - centerPos.x) <= paddleHalfWidth + ballRadius &&
            Math.abs(this.ball.position.z - centerPos.z) <= paddleHalfDepth + ballRadius &&
            Math.abs(this.ball.position.y - centerPos.y) <= paddleHalfHeight + ballRadius) {
            
            console.log("💥 COLLISION AVEC PADDLE CENTRALE ! La Team gagne immédiatement !");
            
            this.centerPaddleHit = true;
            this.isResetting = true;
            this.lastCollisionTime = currentTime;
            
            // CORRECTION : La Team (Player 0) marque quand elle touche la paddle centrale
            this.gameData.scorePlayer0(); // Team = index 0
            this.lastScoredPlayer = 0; // Team a marqué
            
            console.log("Team a marqué! Collision réussie avec Player 2");
            
            // Créer les effets visuels
            this.createCenterPaddleHitEffect();
            
            // Inverser la vélocité de la balle pour l'effet visuel
            this.velocity.x *= -1;
            this.velocity.z *= -0.8;
            
            if (this.pongInstance && this.pongInstance.createPaddleDisintegrationEffect) {
                this.pongInstance.createPaddleDisintegrationEffect(2); // Effet sur la paddle centrale
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
        
        // Flash de la paddle
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

    // CORRECTION MAJEURE : Méthode améliorée pour désactiver toutes les collisions
    private disableAllAutomaticCollisions(): void {
        console.log("🚫 Désactivation COMPLÈTE de toutes les collisions automatiques...");
        
        // 1. Désactiver les collisions pour TOUS les éléments de jeu
        const gameElements = [this.ball, this.player0, this.player1, this.topWall, this.bottomWall];
        
        if (this.centerPaddle) {
            gameElements.push(this.centerPaddle);
        }
        
        gameElements.forEach(element => {
            if (element) {
                element.checkCollisions = false;
                element.isPickable = false; // NOUVEAU
                element.doNotSyncBoundingInfo = true; // NOUVEAU
                console.log(`🚫 Collisions désactivées pour: ${element.name}`);
            }
        });
        
        // 2. NOUVEAU : Désactiver les collisions pour TOUS les meshes de la scène
        this.scene.meshes.forEach((mesh: any) => {
            // Exclure seulement les éléments de jeu principaux de cette désactivation globale
            if (!gameElements.includes(mesh)) {
                mesh.checkCollisions = false;
                mesh.isPickable = false;
                
                // Si c'est un élément d'affichage, le marquer explicitement
                if (mesh.name.includes('scoreDisplay') || 
                    mesh.name.includes('gameOver') ||
                    mesh.name.includes('Plane') ||
                    mesh.name.includes('Text') ||
                    mesh.name.includes('Line') ||
                    mesh.name.includes('wall') ||
                    mesh.name.includes('particle')) {
                    
                    mesh.doNotSyncBoundingInfo = true;
                    console.log(`🚫 Collision et interaction désactivées pour: ${mesh.name}`);
                }
            }
        });
        
        // 3. NOUVEAU : Désactiver le système de collision global de la scène
        this.scene.collisionsEnabled = false;
        this.scene.gravity = new Vector3(0, 0, 0); // S'assurer qu'il n'y a pas de gravité
        
        // 4. NOUVEAU : Hook pour intercepter toute tentative de collision automatique
        const originalIntersectsMesh = this.ball.intersectsMesh;
        this.ball.intersectsMesh = () => false; // Forcer toujours false
        
        console.log("✅ TOUTES les collisions automatiques désactivées (système global)");
        
        // 5. NOUVEAU : Nettoyer périodiquement les éléments temporaires
        this.startTemporaryElementsCleanup();
    }
    
    // NOUVELLE MÉTHODE : Nettoyage périodique des éléments temporaires
    private startTemporaryElementsCleanup(): void {
        const cleanupInterval = setInterval(() => {
            if (this.scene && !this.scene.isDisposed) {
                // Nettoyer les éléments temporaires qui pourraient causer des collisions
                this.scene.meshes.forEach((mesh: any) => {
                    // Supprimer les éléments de particules ou d'animation anciens
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
        }, 5000); // Nettoyage toutes les 5 secondes
    }

    // CORRECTION : Améliorer la méthode debugNearbyMeshes
    private debugNearbyMeshes(): void {
        const ballPos = this.ball.position;
        const radius = 100; // Augmenter le rayon de recherche
        
        console.log("🔍 ANALYSE DES MESHES PROCHES :");
        console.log(`   Position balle: X=${ballPos.x.toFixed(2)}, Y=${ballPos.y.toFixed(2)}, Z=${ballPos.z.toFixed(2)}`);
        
        const nearbyMeshes: any[] = [];
        
        this.scene.meshes.forEach((mesh: any) => {
            if (mesh !== this.ball && mesh.isEnabled() && mesh.isVisible) {
                const distance: number = Vector3.Distance(ballPos, mesh.position);
                if (distance < radius) {
                    nearbyMeshes.push({
                        name: mesh.name,
                        distance: distance,
                        position: mesh.position,
                        checkCollisions: mesh.checkCollisions,
                        isPickable: mesh.isPickable,
                        boundingInfo: mesh.getBoundingInfo ? !!mesh.getBoundingInfo() : false
                    });
                }
            }
        });
        
        // Trier par distance
        nearbyMeshes.sort((a, b) => a.distance - b.distance);
        
        console.log(`   ${nearbyMeshes.length} meshes trouvés dans un rayon de ${radius} unités:`);
        nearbyMeshes.forEach((mesh, index) => {
            console.log(`   ${index + 1}. ${mesh.name}:`);
            console.log(`      Distance: ${mesh.distance.toFixed(2)}`);
            console.log(`      Position: (${mesh.position.x.toFixed(1)}, ${mesh.position.y.toFixed(1)}, ${mesh.position.z.toFixed(1)})`);
            console.log(`      Collisions: ${mesh.checkCollisions}, Pickable: ${mesh.isPickable}, BoundingInfo: ${mesh.boundingInfo}`);
        });
        
        // Vérifier spécifiquement les éléments suspects
        const suspiciousMeshes = nearbyMeshes.filter(m => 
            m.checkCollisions || 
            m.name.includes('Line') || 
            m.name.includes('particle') ||
            m.name.includes('Trail') ||
            m.distance < 20
        );
        
        if (suspiciousMeshes.length > 0) {
            console.warn("⚠️ MESHES SUSPECTS DÉTECTÉS :");
            suspiciousMeshes.forEach(mesh => {
                console.warn(`   - ${mesh.name} (distance: ${mesh.distance.toFixed(2)})`);
            });
        }
    }

    // AUSSI : Créer une version spécifique de handleWallCollisions pour éviter l'héritage
    protected handleWallCollisions(): void {
        const topWallZ = this.topWall.position.z;
        const bottomWallZ = this.bottomWall.position.z;
        const ballRadius = this.ball.getBoundingInfo().boundingSphere.radius;
        const wallCollisionThreshold = BALL_CONFIG.COLLISION_THRESHOLD;
        
        // Top wall collision
        if (this.ball.position.z + ballRadius >= topWallZ - wallCollisionThreshold && this.velocity.z > 0) {
            this.velocity.z = -this.velocity.z;
            this.ball.position.z = topWallZ - ballRadius - wallCollisionThreshold;
            console.log("🔵 Collision mur supérieur en mode multiplayer");
            // Note: Pas d'animation de glow pour simplifier
        }
        
        // Bottom wall collision
        if (this.ball.position.z - ballRadius <= bottomWallZ + wallCollisionThreshold && this.velocity.z < 0) {
            this.velocity.z = -this.velocity.z;
            this.ball.position.z = bottomWallZ + ballRadius + wallCollisionThreshold;
            console.log("🟣 Collision mur inférieur en mode multiplayer");
            // Note: Pas d'animation de glow pour simplifier
        }
    }
}