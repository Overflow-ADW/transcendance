import {
    Scene, 
    Engine, 
    FreeCamera, 
    Vector3, 
    HemisphericLight, 
    MeshBuilder,
    Tools,
    Mesh,
    DynamicTexture,
    StandardMaterial,
    Color3,
    Color4,
    Texture,
    GlowLayer,
    Material,
    ParticleSystem
} from "@babylonjs/core";
import { PongData, GameState, GameEvents, GameType } from "@/game/utils/pongData";
import { PongControls } from "@/game/utils/pongControls";
import { 
    CAMERA_CONFIG, 
    LIGHT_CONFIG, 
    WALL_CONFIG, 
    PLAYER_CONFIG, 
    BALL_CONFIG, 
    CONTROLS_CONFIG,
    GAME_CONFIG,
    MAIN_COLORS
} from "@/game/utils/pongValues";
import { IPongGameMode } from "@/game/modes/DefaultPongMode";
import { GameModeFactory } from "@/game/factories/GameModeFactory";
import { AIDifficulty } from "@/game/utils/AI/pongAI";
import { getDifficultyName } from "@/game/utils/AI/aiConfig";

export class Pong {
    scene: Scene;
    engine: Engine;
    player0!: Mesh;
    player1!: Mesh;
    player2!: Mesh;                // added
    player3!: Mesh;                // added
    ball!: Mesh;
    controls!: PongControls;
    gameData: PongData;
    scorePlayer0Texture!: DynamicTexture;
    scorePlayer1Texture!: DynamicTexture;
    scorePlayer0Mesh!: Mesh;
    scorePlayer1Mesh!: Mesh;
    gameOverTexture!: DynamicTexture;
    gameOverMesh!: Mesh;
    glowLayer!: GlowLayer;
    private wallOriginalTexture!: DynamicTexture;
    private animatingWallColor = false;
    private wallTextureSize = 512;
    private finalAnimationActive = false;
    private finalAnimationPlayer = -1;
    private finalAnimationTexture: DynamicTexture | null = null;
    private barColorTrackingActive = false;
    private trackingTexture: DynamicTexture | null = null;
    private currentGameMode: IPongGameMode | null = null;
    private topWall!: Mesh;
    private bottomWall!: Mesh;
    private topWallPlane!: Mesh;
    private bottomWallPlane!: Mesh;
    private topWallGlowLayer!: GlowLayer;
    private bottomWallGlowLayer!: GlowLayer;

    private player0GlowLayer!: GlowLayer;
    private player1GlowLayer!: GlowLayer;
    private player2GlowLayer!: GlowLayer; // added
    private player3GlowLayer!: GlowLayer; // added

    constructor(private canvas: HTMLCanvasElement) {
        this.engine = new Engine(this.canvas, true);
        
        this.gameData = new PongData({
            maxScore: GAME_CONFIG.DEFAULT_MAX_SCORE,
            gameType: GameType.DEFAULT_PONG,
            player0Name: "Player 1",
            player1Name: "Player 2"
        });
        
        this.scene = this.createScene();
        this.createScoreDisplays();
        this.createGameOverMessage();
        this.setupGameDataListeners();
        
        // Activer le suivi de la barre avec la balle
        this.enableBarColorTracking();
        
        // Initialiser le mode de jeu par défaut
        this.setGameMode(this.gameData.gameType);
        
        // Start the game
        this.gameData.startGame();

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    /**
     * Définit le mode de jeu actuel
     * @param gameType Type de jeu à charger
     */
    public setGameMode(gameType: GameType): void {
        // Nettoyer le mode de jeu précédent s'il existe
        if (this.currentGameMode) {
            this.currentGameMode.cleanup();
        }
        
        // Créer le nouveau mode de jeu
        this.currentGameMode = GameModeFactory.createGameMode(gameType);
        
        // Rassembler les glow layers pour les passer au mode de jeu
        const glowLayers = {
            ballGlowLayer: this.glowLayer,
            topWallGlowLayer: this.topWallGlowLayer,
            bottomWallGlowLayer: this.bottomWallGlowLayer,
            player0GlowLayer: this.player0GlowLayer,
            player1GlowLayer: this.player1GlowLayer
        };
        
        // Initialiser le nouveau mode de jeu
        this.currentGameMode.initialize(
            this.scene,
            this.ball,
            this.player0,
            this.player1,
            this.topWall,
            this.bottomWall,
            this.gameData,
            this.controls,
            this,

        );
        
        // Mettre à jour le type de jeu dans les données
        this.gameData.setGameType(gameType);
    }

    /**
     * Configure et active l'IA
     * @param difficulty Niveau de difficulté (1-3)
     */
    public enableAI(difficulty: AIDifficulty = AIDifficulty.MEDIUM): void {
        // Configurer l'IA
        this.controls.setupAI(difficulty);
        
        // Activer l'IA
        this.controls.activateAI();
        
        // Mettre à jour le nom du joueur pour refléter l'IA
        const currentDifficulty = this.controls.getAIDifficulty();
        this.gameData.setPlayerNames(
            this.gameData.player0Name, 
            `IA ${currentDifficulty ? this.getDifficultyName(currentDifficulty) : 'Moyen'}`
        );
        
        console.log(`IA activée avec difficulté: ${this.getDifficultyName(difficulty)}`);
    }

    /**
     * Désactive l'IA
     */
    public disableAI(): void {
        this.controls.deactivateAI();
        
        // Restaurer le nom du joueur
        this.gameData.setPlayerNames(
            this.gameData.player0Name, 
            "Player 2"
        );
        
        console.log("IA désactivée");
    }

    /**
     * Change la difficulté de l'IA
     */
    public setAIDifficulty(difficulty: AIDifficulty): void {
        this.controls.setAIDifficulty(difficulty);
        
        // Mettre à jour le nom du joueur
        if (this.controls.isAIActive()) {
            this.gameData.setPlayerNames(
                this.gameData.player0Name, 
                `IA ${this.getDifficultyName(difficulty)}`
            );
        }
        
        console.log(`Difficulté IA changée: ${this.getDifficultyName(difficulty)}`);
    }

    /**
     * Obtient le nom de la difficulté
     */
    private getDifficultyName(difficulty: AIDifficulty): string {
        return getDifficultyName(difficulty);
    }

    /**
     * Vérifie si l'IA est active
     */
    public isAIEnabled(): boolean {
        return this.controls.isAIActive();
    }

    /**
     * Anime l'effet de glow quand une raquette touche la balle
     * @param playerIndex Index du joueur (0 ou 1)
     */
    public animatePlayerGlow(playerIndex: number): void {
        const player = playerIndex === 0 ? this.player0 : this.player1;
        const playerGlowLayer = playerIndex === 0 ? this.player0GlowLayer : this.player1GlowLayer;
        
        if (!player || !playerGlowLayer) {
            console.error(`Joueur ${playerIndex} ou glow layer non trouvé`);
            return;
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
        const animationDuration = 500; // ms
        
        const animate = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            
            if (progress < 1) {
                // Interpoler vers les valeurs originales
                const currentEmissiveColor = new Color3(
                    1 - progress * (1 - originalEmissiveColor.r),
                    1 - progress * (1 - originalEmissiveColor.g),
                    1 - progress * (1 - originalEmissiveColor.b)
                );
                
                material.emissiveColor = currentEmissiveColor;
                playerGlowLayer.intensity = 2.0 - (progress * (2.0 - originalGlowIntensity));
                
                requestAnimationFrame(animate);
            } else {
                // Restaurer les valeurs originales
                material.emissiveColor = originalEmissiveColor;
                playerGlowLayer.intensity = originalGlowIntensity;
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Crée des particules d'impact quand une raquette touche la balle
     * @param playerIndex Index du joueur (0 ou 1)
     */
    private createPlayerImpactParticles(playerIndex: number): void {
        const player = playerIndex === 0 ? this.player0 : this.player1;
        const playerColor = playerIndex === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        
        // Créer un système de particules d'impact
        const impactParticles = new ParticleSystem("playerImpactParticles", 50, this.scene);
        
        // Texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        impactParticles.particleTexture = particleTexture;
        
        // Position de l'émetteur à la raquette
        impactParticles.emitter = player.position.clone();
        
        // Zone d'émission autour de la raquette
        impactParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH/2, -PLAYER_CONFIG.HEIGHT/2, -PLAYER_CONFIG.DEPTH/2);
        impactParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH/2, PLAYER_CONFIG.HEIGHT/2, PLAYER_CONFIG.DEPTH/2);
        
        // Couleurs brillantes
        impactParticles.color1 = new Color4(
            Math.min(1, playerColor.r * 2.0),
            Math.min(1, playerColor.g * 2.0),
            Math.min(1, playerColor.b * 2.0),
            1.0
        );
        impactParticles.color2 = new Color4(1, 1, 1, 1.0);
        impactParticles.colorDead = new Color4(playerColor.r, playerColor.g, playerColor.b, 0);
        
        // Configuration
        impactParticles.minSize = 0.2;
        impactParticles.maxSize = 0.8;
        impactParticles.minLifeTime = 0.2;
        impactParticles.maxLifeTime = 0.5;
        impactParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Direction des particules vers l'extérieur
        const directionX = playerIndex === 0 ? -1 : 1;
        impactParticles.direction1 = new Vector3(directionX * 2, -2, -2);
        impactParticles.direction2 = new Vector3(directionX * 2, 2, 2);
        
        // Émission
        impactParticles.createSphereEmitter(2.0);
        impactParticles.minEmitPower = 3;
        impactParticles.maxEmitPower = 8;
        impactParticles.gravity = new Vector3(0, -1, 0);
        
        // Émission unique
        impactParticles.emitRate = 0;
        impactParticles.manualEmitCount = 30;
        
        // Démarrer
        impactParticles.start();
        
        // Nettoyage
        setTimeout(() => {
            impactParticles.stop();
            setTimeout(() => {
                impactParticles.dispose();
            }, 500);
        }, 100);
    }

    private createScene(): Scene {
        const scene = new Scene(this.engine);
        
        // Définir la couleur d'arrière-plan à noir avec une opacité complète (1.0)
        scene.clearColor = new Color4(0.02, 0.02, 0.02, 1);
        
        const camera = new FreeCamera("camera", new Vector3(0, CAMERA_CONFIG.HEIGHT, 0), this.scene);
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);

        // Basic setup
        camera.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        hemiLight.intensity = LIGHT_CONFIG.INTENSITY;
        camera.attachControl();

        // Create ball
        this.ball = MeshBuilder.CreateSphere("ball", {diameter: BALL_CONFIG.DIAMETER}, this.scene);
        this.ball.position = new Vector3(
            BALL_CONFIG.INITIAL_POSITION.X, 
            BALL_CONFIG.INITIAL_POSITION.Y, 
            BALL_CONFIG.INITIAL_POSITION.Z
        );
        
        // Create collision walls (invisible)
        this.topWall = MeshBuilder.CreateBox("topWall", {
            width: WALL_CONFIG.WIDTH, 
            height: WALL_CONFIG.HEIGHT, 
            depth: WALL_CONFIG.DEPTH
        }, this.scene);
        
        this.bottomWall = MeshBuilder.CreateBox("bottomWall", {
            width: WALL_CONFIG.WIDTH, 
            height: WALL_CONFIG.HEIGHT, 
            depth: WALL_CONFIG.DEPTH
        }, this.scene);

        this.topWall.position = new Vector3(0, WALL_CONFIG.POSITION_Y, WALL_CONFIG.TOP_POSITION_Z);
        this.bottomWall.position = new Vector3(0, WALL_CONFIG.POSITION_Y, WALL_CONFIG.BOTTOM_POSITION_Z);
        this.topWall.isVisible = false;
        this.bottomWall.isVisible = false;

        // Create visual planes for walls - face the camera directly
        this.topWallPlane = MeshBuilder.CreatePlane("topWallPlane", {
            width: WALL_CONFIG.WIDTH,
            height: 20 // Hauteur fixe du plan visible
        }, this.scene);

        this.bottomWallPlane = MeshBuilder.CreatePlane("bottomWallPlane", {
            width: WALL_CONFIG.WIDTH,
            height: 20 // Hauteur fixe du plan visible
        }, this.scene);

        // Les positions et rotations sont définies dans createSplitColorMaterialForWalls
        this.createSplitColorMaterialForWalls(this.topWallPlane, this.bottomWallPlane);

        // Create players
        this.player0 = MeshBuilder.CreateBox("player0", {
            width: PLAYER_CONFIG.WIDTH, 
            height: PLAYER_CONFIG.HEIGHT, 
            depth: PLAYER_CONFIG.DEPTH
        }, this.scene);
        
        this.player1 = MeshBuilder.CreateBox("player1", {
            width: PLAYER_CONFIG.WIDTH, 
            height: PLAYER_CONFIG.HEIGHT, 
            depth: PLAYER_CONFIG.DEPTH
        }, this.scene);

        // --- NEW: create optional player2 & player3 (hidden by default, used in 4-player modes) ---
        this.player2 = MeshBuilder.CreateBox("player2", {
            width: PLAYER_CONFIG.WIDTH,
            height: PLAYER_CONFIG.HEIGHT,
            depth: PLAYER_CONFIG.DEPTH
        }, this.scene);
        const player2Mat = new StandardMaterial("player2Mat", this.scene);
        player2Mat.diffuseColor = MAIN_COLORS.RGB_GREEN;
        player2Mat.emissiveColor = MAIN_COLORS.RGB_GREEN.scale(0.5);
        player2Mat.specularColor = new Color3(0.2, 0.2, 0.2);
        this.player2.material = player2Mat;
        // place off-screen by default so it doesn't interfere with default mode
        this.player2.position = new Vector3(0, PLAYER_CONFIG.POSITION_Y, 1000);
        this.player2.isVisible = false;

        this.player3 = MeshBuilder.CreateBox("player3", {
            width: PLAYER_CONFIG.WIDTH,
            height: PLAYER_CONFIG.HEIGHT,
            depth: PLAYER_CONFIG.DEPTH
        }, this.scene);
        const player3Mat = new StandardMaterial("player3Mat", this.scene);
        player3Mat.diffuseColor = MAIN_COLORS.RGB_YELLOW;
        player3Mat.emissiveColor = MAIN_COLORS.RGB_YELLOW.scale(0.5);
        player3Mat.specularColor = new Color3(0.2, 0.2, 0.2);
        this.player3.material = player3Mat;
        this.player3.position = new Vector3(0, PLAYER_CONFIG.POSITION_Y, 1000);
        this.player3.isVisible = false;
        // --- END new players ---

        // Create player materials
        const player0Material = new StandardMaterial("player0Mat", this.scene);
        player0Material.diffuseColor = MAIN_COLORS.RGB_BLUE;
        player0Material.emissiveColor = MAIN_COLORS.RGB_BLUE.scale(0.5);
        player0Material.specularColor = new Color3(0.2, 0.2, 0.2);
        this.player0.material = player0Material;
        
        const player1Material = new StandardMaterial("player1Mat", this.scene);
        player1Material.diffuseColor = MAIN_COLORS.RGB_PURPLE;
        player1Material.emissiveColor = MAIN_COLORS.RGB_PURPLE.scale(0.5);
        player1Material.specularColor = new Color3(0.2, 0.2, 0.2);
        this.player1.material = player1Material;

        // Position players - COMMENCER AVEC LES RAQUETTES HORS ÉCRAN pour forcer l'animation au début
        this.player0.position = new Vector3(
            PLAYER_CONFIG.PLAYER0_POSITION_X, 
            PLAYER_CONFIG.POSITION_Y, 
            300 // Position hors écran pour forcer l'animation au début
        );
        
        this.player1.position = new Vector3(
            PLAYER_CONFIG.PLAYER1_POSITION_X, 
            PLAYER_CONFIG.POSITION_Y, 
            -300 // Position hors écran pour forcer l'animation au début
        );

        // Setup glow layers - séparation des effets lumineux
        this.glowLayer = new GlowLayer("ballGlow", this.scene);
        this.glowLayer.intensity = 1.0;
        this.glowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.glowLayer.addIncludedOnlyMesh(this.ball);

        // Glow layers COMPLÈTEMENT séparés pour CHAQUE joueur
        this.player0GlowLayer = new GlowLayer("player0Glow", this.scene);
        this.player0GlowLayer.intensity = 0.8; // Intensité constante
        this.player0GlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.player0GlowLayer.addIncludedOnlyMesh(this.player0);

        this.player1GlowLayer = new GlowLayer("player1Glow", this.scene);
        this.player1GlowLayer.intensity = 0.8; // Intensité constante
        this.player1GlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.player1GlowLayer.addIncludedOnlyMesh(this.player1);

        // Add glow layers for player2 & player3 (won't hurt if meshes hidden)
        this.player2GlowLayer = new GlowLayer("player2Glow", this.scene);
        this.player2GlowLayer.intensity = 0.8;
        this.player2GlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.player2GlowLayer.addIncludedOnlyMesh(this.player2);

        this.player3GlowLayer = new GlowLayer("player3Glow", this.scene);
        this.player3GlowLayer.intensity = 0.8;
        this.player3GlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.player3GlowLayer.addIncludedOnlyMesh(this.player3);

        // Glow layers COMPLÈTEMENT séparés pour CHAQUE mur
        this.topWallGlowLayer = new GlowLayer("topWallGlow", this.scene);
        this.topWallGlowLayer.intensity = 0.6; // Intensité constante
        this.topWallGlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.topWallGlowLayer.addIncludedOnlyMesh(this.topWallPlane);

        this.bottomWallGlowLayer = new GlowLayer("bottomWallGlow", this.scene);
        this.bottomWallGlowLayer.intensity = 0.6; // Intensité constante
        this.bottomWallGlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.bottomWallGlowLayer.addIncludedOnlyMesh(this.bottomWallPlane);

        // Setup controls
        this.controls = new PongControls(
            scene, 
            this.player0, 
            this.player1,
            this.gameData,
            { 
                speed: CONTROLS_CONFIG.SPEED, 
                maxZ: CONTROLS_CONFIG.MAX_Z, 
                minZ: CONTROLS_CONFIG.MIN_Z 
            }
        );

        // NOUVEAU : Définir la référence à la balle pour l'IA
        this.controls.setBallReference(this.ball);

        return scene;
    }

    private createSplitColorMaterialForWalls(topWallPlane: Mesh, bottomWallPlane: Mesh): void {
        // Réorienter les plans pour qu'ils fassent face à la caméra
        topWallPlane.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        bottomWallPlane.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        
        // Repositionner les plans au-dessus des murs de collision
        topWallPlane.position = new Vector3(
            0, 
            WALL_CONFIG.POSITION_Y + 2, // Légèrement au-dessus pour éviter le z-fighting
            WALL_CONFIG.TOP_POSITION_Z
        );
        
        bottomWallPlane.position = new Vector3(
            0, 
            WALL_CONFIG.POSITION_Y + 2, // Légèrement au-dessus pour éviter le z-fighting
            WALL_CONFIG.BOTTOM_POSITION_Z
        );
        
        // Créer un matériau avec la texture divisée
        const wallMaterial = new StandardMaterial("wallMaterial", this.scene);
        
        // Créer une texture dynamique simple avec deux couleurs
        this.wallTextureSize = 512;
        this.wallOriginalTexture = new DynamicTexture(
            "wallTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );
        
        const context = this.wallOriginalTexture.getContext() as unknown as CanvasRenderingContext2D;
        
        // Désactiver l'anti-aliasing pour des bords nets
        context.imageSmoothingEnabled = false;
        
        // Dessiner la moitié gauche en bleu
        context.fillStyle = MAIN_COLORS.HEX_BLUE;
        context.fillRect(0, 0, this.wallTextureSize / 2, this.wallTextureSize);
        
        // Dessiner la moitié droite en mauve
        context.fillStyle = MAIN_COLORS.HEX_PURPLE;
        context.fillRect(this.wallTextureSize / 2, 0, this.wallTextureSize / 2, this.wallTextureSize);
        
        // Supprimer la ligne blanche au centre
        
        // Mettre à jour la texture sans générer de mipmaps
        this.wallOriginalTexture.update(false);
        
        // Appliquer la texture au matériau
        wallMaterial.diffuseTexture = this.wallOriginalTexture;
        wallMaterial.emissiveTexture = this.wallOriginalTexture;
        wallMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
        wallMaterial.specularColor = new Color3(0.2, 0.2, 0.2);
        
        // Appliquer le matériau aux plans
        topWallPlane.material = wallMaterial;
        bottomWallPlane.material = wallMaterial;
    }

    private createScoreDisplays(): void {
        // Create score textures
        this.scorePlayer0Texture = new DynamicTexture(
            "scoreTexture0", 
            { width: GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE, height: GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE }, 
            this.scene, 
            true,
            Texture.TRILINEAR_SAMPLINGMODE
        );
        
        this.scorePlayer1Texture = new DynamicTexture(
            "scoreTexture1", 
            { width: GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE, height: GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE }, 
            this.scene, 
            true,
            Texture.TRILINEAR_SAMPLINGMODE
        );
        
        // Create score materials - Modifier pour ressembler aux matériaux des raquettes
        const scorePlayer0Material = new StandardMaterial("scoreMat0", this.scene);
        scorePlayer0Material.diffuseTexture = this.scorePlayer0Texture;
        scorePlayer0Material.emissiveTexture = this.scorePlayer0Texture; // Ajouter texture émissive
        scorePlayer0Material.emissiveColor = MAIN_COLORS.RGB_BLUE;
        scorePlayer0Material.specularColor = new Color3(0.2, 0.2, 0.2); // Comme les raquettes
        scorePlayer0Material.useAlphaFromDiffuseTexture = true;
        scorePlayer0Material.backFaceCulling = false;
        
        const scorePlayer1Material = new StandardMaterial("scoreMat1", this.scene);
        scorePlayer1Material.diffuseTexture = this.scorePlayer1Texture;
        scorePlayer1Material.emissiveTexture = this.scorePlayer1Texture; // Ajouter texture émissive
        scorePlayer1Material.emissiveColor = MAIN_COLORS.RGB_PURPLE;
        scorePlayer1Material.specularColor = new Color3(0.2, 0.2, 0.2); // Comme les raquettes
        scorePlayer1Material.useAlphaFromDiffuseTexture = true;
        scorePlayer1Material.backFaceCulling = false;
        
        // Supprimer disableLighting pour avoir un rendu similaire aux raquettes
        
        // Create score display planes
        this.scorePlayer0Mesh = MeshBuilder.CreatePlane(
            "scoreDisplay0", 
            { width: GAME_CONFIG.DISPLAY.SCORE_PLANE_WIDTH, height: GAME_CONFIG.DISPLAY.SCORE_PLANE_HEIGHT }, 
            this.scene
        );
        
        this.scorePlayer0Mesh.position = new Vector3(
            -GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_X_OFFSET, 
            GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_Y, 
            0
        );
        
        this.scorePlayer0Mesh.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        this.scorePlayer0Mesh.material = scorePlayer0Material;
        
        this.scorePlayer1Mesh = MeshBuilder.CreatePlane(
            "scoreDisplay1", 
            { width: GAME_CONFIG.DISPLAY.SCORE_PLANE_WIDTH, height: GAME_CONFIG.DISPLAY.SCORE_PLANE_HEIGHT }, 
            this.scene
        );
        
        this.scorePlayer1Mesh.position = new Vector3(
            GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_X_OFFSET, 
            GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_Y, 
            0
        );
        
        this.scorePlayer1Mesh.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        this.scorePlayer1Mesh.material = scorePlayer1Material;
        
        // Initialize scores
        this.updateScoreDisplays(0, 0);
    }

    private updateScoreDisplays(score0: number, score1: number): void {
        const context0 = this.scorePlayer0Texture.getContext() as unknown as CanvasRenderingContext2D;
        const context1 = this.scorePlayer1Texture.getContext() as unknown as CanvasRenderingContext2D;
        
        // Clear previous content
        context0.clearRect(0, 0, GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE, GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE);
        context1.clearRect(0, 0, GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE, GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE);
        
        // Configure text style
        context0.textAlign = 'center';
        context0.textBaseline = 'middle';
        context1.textAlign = 'center';
        context1.textBaseline = 'middle';
        
        const fontSize = GAME_CONFIG.DISPLAY.SCORE_FONT_SIZE;
        const font = `bold ${fontSize}px Arial`;
        
        // Pour le joueur 0 (bleu) - utiliser la couleur bleue
        context0.font = font;
        context0.fillStyle = MAIN_COLORS.HEX_BLUE;
        
        // Pour le joueur 1 (mauve) - utiliser la couleur mauve
        context1.font = font;
        context1.fillStyle = MAIN_COLORS.HEX_PURPLE;
        
        // Draw scores
        context0.fillText(
            score0.toString(), 
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2, 
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2
        );
        
        context1.fillText(
            score1.toString(), 
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2, 
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2
        );
        
        // Update textures
        this.scorePlayer0Texture.update();
        this.scorePlayer1Texture.update();
        this.scorePlayer0Texture.hasAlpha = true;
        this.scorePlayer1Texture.hasAlpha = true;
    }

    private createGameOverMessage(): void {
        this.gameOverTexture = new DynamicTexture(
            "gameOverTexture", 
            { width: 512, height: 256 }, 
            this.scene, 
            true,
            Texture.TRILINEAR_SAMPLINGMODE
        );
        
        const gameOverMaterial = new StandardMaterial("gameOverMat", this.scene);
        gameOverMaterial.diffuseTexture = this.gameOverTexture;
        gameOverMaterial.emissiveColor = new Color3(1, 1, 1);
        gameOverMaterial.specularColor = new Color3(0, 0, 0);
        gameOverMaterial.useAlphaFromDiffuseTexture = true;
        gameOverMaterial.backFaceCulling = false;
        gameOverMaterial.disableLighting = true;
        
        this.gameOverMesh = MeshBuilder.CreatePlane(
            "gameOverDisplay", 
            { width: 400, height: 200 }, 
            this.scene
        );
        
        this.gameOverMesh.position = new Vector3(0, 150, 0);
        this.gameOverMesh.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        this.gameOverMesh.material = gameOverMaterial;
        this.gameOverMesh.isVisible = false;
    }

    private showGameOverMessage(): void {
        const winnerName = this.gameData.winner === 0 ? 
            this.gameData.player0Name : 
            this.gameData.player1Name;
        
        const context = this.gameOverTexture.getContext() as unknown as CanvasRenderingContext2D;
        
        context.clearRect(0, 0, 512, 256);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = 'bold 40px Arial';
        context.fillStyle = '#FFD700'; // Gold color
        
        context.fillText(`${winnerName} has won!`, 256, 128);
        
        this.gameOverTexture.update();
        this.gameOverTexture.hasAlpha = true;
        this.gameOverMesh.isVisible = true;
    }

    private setupGameDataListeners(): void {
        // Variables pour suivre les scores précédents
        let prevScorePlayer0 = 0;
        let prevScorePlayer1 = 0;

        // Score change listener
        this.gameData.on(GameEvents.SCORE_CHANGED, (scores) => {
            console.log("Scores mis à jour:", scores);
            this.updateScoreDisplays(scores.player0, scores.player1);
            
            // S'assurer que les scores sont visibles
            this.scorePlayer0Mesh.isVisible = true;
            this.scorePlayer1Mesh.isVisible = true;
            
            // Comparer avec les scores précédents pour déterminer qui a marqué
            if (scores.player0 > prevScorePlayer0) {
                // Player 0 a marqué - désactiver le suivi et déclencher l'animation
                this.barColorTrackingActive = false;
                
                // Vérifier si c'est le point gagnant
                if (scores.player0 >= this.gameData.maxScore) {
                    this.animateWallColorTransitionFinal(0);
                } else {
                    this.animateWallColorTransition(0);
                }
            } else if (scores.player1 > prevScorePlayer1) {
                // Player 1 a marqué - désactiver le suivi et déclencher l'animation
                this.barColorTrackingActive = false;
                
                // Vérifier si c'est le point gagnant
                if (scores.player1 >= this.gameData.maxScore) {
                    this.animateWallColorTransitionFinal(1);
                } else {
                    this.animateWallColorTransition(1);
                }
            }
            
            // Mettre à jour les scores précédents
            prevScorePlayer0 = scores.player0;
            prevScorePlayer1 = scores.player1;
        });

        // Player win listener
        this.gameData.on(GameEvents.PLAYER_WON, () => {
            // Cacher les scores pendant le game over UNIQUEMENT si le message est affiché
            setTimeout(() => {
                if (this.gameOverMesh.isVisible) {
                    this.scorePlayer0Mesh.isVisible = false;
                    this.scorePlayer1Mesh.isVisible = false;
                }
            }, 100);
            
            // Afficher le message de game over
            this.showGameOverMessage();
            
            // Reset after delay
            setTimeout(() => {
                // Cacher le message game over
                this.gameOverMesh.isVisible = false;
                
                // Attendre un court délai pour que le message disparaisse visuellement
                // PUIS réinitialiser le jeu
                setTimeout(() => {
                    this.gameData.resetGame();
                    
                    // IMPORTANT: Réinitialiser les scores et s'assurer qu'ils sont visibles
                    this.updateScoreDisplays(0, 0);
                    this.scorePlayer0Mesh.isVisible = true;
                    this.scorePlayer1Mesh.isVisible = true;
                    
                    this.gameData.startGame();
                }, 500); // Délai pour la transition visuelle
            }, GAME_CONFIG.RESET_DELAY_MS);
        });

        // Écouteur pour le repositionnement des raquettes
        this.gameData.on('PLAYERS_REPOSITIONED', () => {
            console.log("Joueurs repositionnés - vérification des animations");
            
            // Réafficher les scores lorsque les raquettes sont repositionnées - IMPORTANT
            this.scorePlayer0Mesh.isVisible = true;
            this.scorePlayer1Mesh.isVisible = true;
            
            // Si une animation finale est active, la terminer
            if (this.finalAnimationActive) {
                this.endFinalAnimation();
            } 
            else if (this.animatingWallColor) {
                // Si une animation normale est toujours en cours, la terminer immédiatement
                console.log("Animation de goal interrompue - réactivation du suivi");
                this.animatingWallColor = false;
                this.barColorTrackingActive = true;
            }
            else {
                // Sinon, s'assurer que le suivi est activé
                console.log("Réactivation du suivi");
                this.barColorTrackingActive = true;
                this.updateBarColorBasedOnBallPosition(); // Mise à jour immédiate
            }
        });

        // Game state change listener
        this.gameData.on(GameEvents.GAME_STATE_CHANGED, (state) => {
            console.log("Game state changed to:", state);
            if (state === GameState.PLAYING) {
                this.gameOverMesh.isVisible = false;
                
                // S'assurer que les scores sont visibles quand le jeu commence
                this.scorePlayer0Mesh.isVisible = true;
                this.scorePlayer1Mesh.isVisible = true;
            }
        });
        
        // Game reset listener - Assurer que les animations sont correctement réinitialisées
        this.gameData.on(GameEvents.GAME_RESET, () => {
            console.log("Game reset - réinitialisation des animations");
            this.gameOverMesh.isVisible = false;
            
            // Réinitialiser l'IA si elle est active
            if (this.controls.isAIActive()) {
                this.controls.resetAI();
            }
            
            // S'assurer que les scores sont visibles et réinitialisés
            this.updateScoreDisplays(0, 0);
            this.scorePlayer0Mesh.isVisible = true;
            this.scorePlayer1Mesh.isVisible = true;
            
            // S'assurer que tous les flags d'animation sont réinitialisés
            this.animatingWallColor = false;
            
            // S'il y a une animation finale en cours, la terminer immédiatement
            if (this.finalAnimationActive) {
                this.endFinalAnimation();
            }
            
            // Recréer la texture d'origine pour les murs, au cas où
            const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
            const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
            
            if (topWallPlane && bottomWallPlane && (topWallPlane.material instanceof StandardMaterial)) {
                // Réactiver explicitement le suivi de la balle
                this.barColorTrackingActive = true;
                
                // Mettre à jour la position immédiatement pour éviter un saut visuel
                setTimeout(() => {
                    if (this.barColorTrackingActive) {
                        this.updateBarColorBasedOnBallPosition();
                    }
                }, 100);
            }
        });
    }

    private animateWallColorTransition(player: number): void {
        console.log(`Début d'animation de la couleur pour le joueur ${player}`);
        
        // Si une animation est déjà en cours, ne pas démarrer une nouvelle
        if (this.animatingWallColor) {
            console.log("Animation déjà en cours - ignorer");
            return;
        }
        
        this.animatingWallColor = true;
        
        // Récupérer les murs pour vérifier leur matériau
        const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
        const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
        
        if (!topWallPlane || !bottomWallPlane) {
            console.error("Murs non trouvés");
            this.animatingWallColor = false;
            return;
        }
        
        if (!(topWallPlane.material instanceof StandardMaterial)) {
            console.error("Le matériau des murs n'est pas un StandardMaterial");
            this.animatingWallColor = false;
            return;
        }
        
        console.log("Murs et matériaux trouvés, création de la texture d'animation");
        
        // Obtenir le matériau partagé
        const wallMaterial = topWallPlane.material as StandardMaterial;
        
        // Sauvegarder l'état d'émission original du matériau
        const originalEmissiveColor = wallMaterial.emissiveColor.clone();
        
        // Créer une nouvelle texture dynamique pour l'animation
        const animTexture = new DynamicTexture(
            "wallAnimTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );
        
        // Obtenir le contexte pour dessiner
        const ctx = animTexture.getContext() as unknown as CanvasRenderingContext2D;
        ctx.imageSmoothingEnabled = false;
        
        // Durées des phases de l'animation
        const phaseDurations = {
            hold: 1000,       // Phase de maintien: 1000ms
            returnToMid: 200  // Phase de retour: 200ms
        };
        
        const totalDuration = phaseDurations.hold + phaseDurations.returnToMid;
        const startTime = performance.now();
        
        // Fonction pour calculer la progression non-linéaire
        const easeInOut = (t: number): number => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };
        
        // Fonction pour dessiner l'état actuel de l'animation
        const drawTransition = (elapsedTime: number): void => {
            // Effacer le canvas
            ctx.clearRect(0, 0, this.wallTextureSize, this.wallTextureSize);
            
            if (elapsedTime < phaseDurations.hold) {
                // Phase 1: Maintien (couleur complète)
                if (player === 0) {
                    // Remplir complètement avec la couleur bleue
                    ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
                    ctx.fillRect(0, 0, this.wallTextureSize, this.wallTextureSize);
                } else {
                    // Remplir complètement avec la couleur mauve
                    ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
                    ctx.fillRect(0, 0, this.wallTextureSize, this.wallTextureSize);
                }
            } 
            else {
                // Phase 2: Retour au milieu
                const phaseElapsed = elapsedTime - phaseDurations.hold;
                const progress = easeInOut(phaseElapsed / phaseDurations.returnToMid);
                
                if (player === 0) {
                    // Le bleu revient à 50%
                    const blueWidth = this.wallTextureSize * (1 - progress * 0.5);
                    
                    // Dessiner la partie bleue
                    ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
                    ctx.fillRect(0, 0, blueWidth, this.wallTextureSize);
                    
                    // Dessiner la partie mauve
                    ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
                    ctx.fillRect(blueWidth, 0, this.wallTextureSize - blueWidth, this.wallTextureSize);
                } else {
                    // Le mauve revient à 50%
                    const purpleStart = this.wallTextureSize * progress * 0.5;
                    
                    // Dessiner la partie bleue
                    ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
                    ctx.fillRect(0, 0, purpleStart, this.wallTextureSize);
                    
                    // Dessiner la partie mauve
                    ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
                    ctx.fillRect(purpleStart, 0, this.wallTextureSize - purpleStart, this.wallTextureSize);
                }
            }
        };
        
        // Fonction d'animation
        const animate = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            
            if (elapsedTime < totalDuration) {
                // L'animation est encore en cours
                drawTransition(elapsedTime);
                
                // Mettre à jour et appliquer la texture
                animTexture.update(false);
                wallMaterial.diffuseTexture = animTexture;
                wallMaterial.emissiveTexture = animTexture;
                wallMaterial.markAsDirty(Material.TextureDirtyFlag);
                
                // Continuer l'animation
                requestAnimationFrame(animate);
            } else {
                // Animation terminée - réactiver le suivi de la balle
                console.log("Animation terminée, réactivation du suivi de la balle");
                
                try {
                    // Créer une texture de transition pour éviter l'écran noir
                    const transitionTexture = new DynamicTexture(
                        "transitionTexture", 
                        { width: this.wallTextureSize, height: this.wallTextureSize }, 
                        this.scene, 
                        false,
                        Texture.NEAREST_SAMPLINGMODE
                    );
                    
                    const transCtx = transitionTexture.getContext() as unknown as CanvasRenderingContext2D;
                    transCtx.imageSmoothingEnabled = false;
                    
                    // Dessiner la division 50/50 explicitement
                    transCtx.fillStyle = MAIN_COLORS.HEX_BLUE;
                    transCtx.fillRect(0, 0, this.wallTextureSize / 2, this.wallTextureSize);
                    
                    transCtx.fillStyle = MAIN_COLORS.HEX_PURPLE;
                    transCtx.fillRect(this.wallTextureSize / 2, 0, this.wallTextureSize / 2, this.wallTextureSize);
                    
                    transitionTexture.update(false);
                    
                    // Appliquer cette texture intermédiaire avant de passer au tracking
                    wallMaterial.diffuseTexture = transitionTexture;
                    wallMaterial.emissiveTexture = transitionTexture;
                    wallMaterial.emissiveColor = originalEmissiveColor; // Restaurer la couleur émissive
                    wallMaterial.markAsDirty(Material.TextureDirtyFlag);
                    
                    // Nettoyer les ressources
                    animTexture.dispose();
                    
                    // Attendre un court instant pour s'assurer que la texture est appliquée
                    setTimeout(() => {
                        // Seulement maintenant réinitialiser le flag d'animation
                        this.animatingWallColor = false;
                        
                        // IMPORTANT: Réactiver le suivi de la balle
                        this.barColorTrackingActive = true;
                        
                        // S'assurer que la texture de tracking est correcte
                        if (this.trackingTexture) {
                            // Appliquer la texture de tracking
                            wallMaterial.diffuseTexture = this.trackingTexture;
                            wallMaterial.emissiveTexture = this.trackingTexture;
                            wallMaterial.markAsDirty(Material.TextureDirtyFlag);
                            
                            // Mettre à jour immédiatement la position
                            this.updateBarColorBasedOnBallPosition();
                            
                            // Nettoyer la texture de transition
                            transitionTexture.dispose();
                        }
                        
                        console.log("Animation de couleur terminée, suivi réactivé avec succès");
                    }, 50);
                } catch (error) {
                    console.error("Erreur lors de la fin de l'animation:", error);
                    // Fallback en cas d'erreur
                    this.animatingWallColor = false;
                    this.barColorTrackingActive = true;
                    
                    // Réinitialiser la texture à partir de zéro
                    this.enableBarColorTracking();
                }
            }
        };
        
        // Démarrer l'animation
        console.log("Démarrage de l'animation");
        animate();
    }

    private animateWallColorTransitionFinal(player: number): void {
        console.log(`Début d'animation finale pour le joueur ${player}`);
        
        // Si une animation est déjà en cours, l'arrêter
        if (this.animatingWallColor) {
            console.log("Animation en cours arrêtée pour l'animation finale");
            this.animatingWallColor = false;
        }
        
        // Marquer l'animation finale comme active
        this.finalAnimationActive = true;
        this.finalAnimationPlayer = player;
        
        // Récupérer les murs pour vérifier leur matériau
        const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
        const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
        
        if (!topWallPlane || !bottomWallPlane || !(topWallPlane.material instanceof StandardMaterial)) {
            console.error("Murs non trouvés ou matériau incorrect");
            this.finalAnimationActive = false;
            return;
        }
        
        // Obtenir le matériau partagé
        const wallMaterial = topWallPlane.material as StandardMaterial;
        
        // Créer une nouvelle texture dynamique pour l'animation finale
        this.finalAnimationTexture = new DynamicTexture(
            "finalWallTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );
        
        // Obtenir le contexte pour dessiner
        const ctx = this.finalAnimationTexture.getContext() as unknown as CanvasRenderingContext2D;
        ctx.imageSmoothingEnabled = false;
        
        // Dessiner la texture finale (la couleur du joueur gagnant remplit tout)
        if (player === 0) {
            // Remplir complètement avec la couleur bleue (player 0)
            ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
            ctx.fillRect(0, 0, this.wallTextureSize, this.wallTextureSize);
        } else {
            // Remplir complètement avec la couleur mauve (player 1)
            ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
            ctx.fillRect(0, 0, this.wallTextureSize, this.wallTextureSize);
        }
        
        // Mettre à jour et appliquer la texture
        this.finalAnimationTexture.update(false);
        wallMaterial.diffuseTexture = this.finalAnimationTexture;
        wallMaterial.emissiveTexture = this.finalAnimationTexture;
        wallMaterial.markAsDirty(Material.TextureDirtyFlag);
        
        console.log("Animation finale appliquée - restera jusqu'à la prochaine partie");
    }

    private endFinalAnimation(): void {
        if (!this.finalAnimationActive || !this.finalAnimationTexture) {
            return;
        }
        
        console.log("Fin de l'animation finale");
        
        // Récupérer les murs
        const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
        const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
        
        if (!topWallPlane || !bottomWallPlane || !(topWallPlane.material instanceof StandardMaterial)) {
            return;
        }
        
        // Obtenir le matériau partagé
        const wallMaterial = topWallPlane.material as StandardMaterial;
        
        // Créer une texture finale avec la division au milieu
        const finalTexture = new DynamicTexture(
            "resetWallTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );
        
        const finalCtx = finalTexture.getContext() as unknown as CanvasRenderingContext2D;
        finalCtx.imageSmoothingEnabled = false;
        
        // Dessiner la moitié gauche en bleu
        finalCtx.fillStyle = MAIN_COLORS.HEX_BLUE;
        finalCtx.fillRect(0, 0, this.wallTextureSize / 2, this.wallTextureSize);
        
        // Dessiner la moitié droite en mauve
        finalCtx.fillStyle = MAIN_COLORS.HEX_PURPLE;
        finalCtx.fillRect(this.wallTextureSize / 2, 0, this.wallTextureSize / 2, this.wallTextureSize);
        
        finalTexture.update(false);
        
        // Appliquer la texture finale
        wallMaterial.diffuseTexture = finalTexture;
        wallMaterial.emissiveTexture = finalTexture;
        wallMaterial.markAsDirty(Material.TextureDirtyFlag);
        
        // Nettoyer les ressources
        this.finalAnimationTexture.dispose();
        this.finalAnimationTexture = null;
        
        // Réinitialiser l'état de l'animation
        this.finalAnimationActive = false;
        this.finalAnimationPlayer = -1;
        
        console.log("Animation finale terminée, texture réinitialisée");
    }

    private enableBarColorTracking(): void {
        if (this.barColorTrackingActive) return;
        
        this.barColorTrackingActive = true;
        
        // Créer une texture dédiée pour le suivi
        this.trackingTexture = new DynamicTexture(
            "trackingTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );
        
        // Obtenir les murs
        const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
        const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
        
        if (!topWallPlane || !bottomWallPlane || !(topWallPlane.material instanceof StandardMaterial)) {
            console.error("Murs non trouvés ou matériau incorrect pour le suivi");
            this.barColorTrackingActive = false;
            return;
        }
        
        // Obtenir le matériau partagé
        const wallMaterial = topWallPlane.material as StandardMaterial;
        
        // Appliquer la texture de suivi
        wallMaterial.diffuseTexture = this.trackingTexture;
        wallMaterial.emissiveTexture = this.trackingTexture;
        
        // Enregistrer une fonction de rendu pour mettre à jour la texture en fonction de la position de la balle
        // Utiliser un debounce pour l'efficacité
        let lastUpdate = 0;
        const updateInterval = 16; // ~60 FPS
        
        this.scene.registerBeforeRender(() => {
            // Ne pas mettre à jour la texture à chaque frame pour économiser les ressources
            const now = performance.now();
            if (now - lastUpdate < updateInterval || !this.barColorTrackingActive) return;
            lastUpdate = now;
            
            // Si le jeu est en GAME_OVER ou si la balle n'est pas visible, ne pas mettre à jour
            if (this.gameData.gameState === GameState.GAME_OVER || !this.ball.isVisible) return;
            
            // Si une animation finale est active, ne pas mettre à jour
            if (this.finalAnimationActive) return;
            
            this.updateBarColorBasedOnBallPosition();
        });
        
        console.log("Suivi des barres avec la balle activé");
    }

    private updateBarColorBasedOnBallPosition(): void {
        if (!this.trackingTexture) return;
        
        const ctx = this.trackingTexture.getContext() as unknown as CanvasRenderingContext2D;
        ctx.imageSmoothingEnabled = false;
        
        // CORRECTION: Utiliser la largeur réelle des murs au lieu de OUT_OF_BOUNDS_X
        const wallWidth = WALL_CONFIG.WIDTH; // 1000
        const wallHalfWidth = wallWidth / 2; // 500
        
        // La balle se déplace dans la zone [-wallHalfWidth, +wallHalfWidth] visible sur les murs
        // Normaliser la position de la balle par rapport à la largeur des murs
        const normalizedPosition = (this.ball.position.x + wallHalfWidth) / wallWidth;
        
        // S'assurer que la position est dans les limites [0, 1]
        const clampedPosition = Math.max(0, Math.min(1, normalizedPosition));
        
        // Convertir en pixels pour la texture
        const divisionPixel = Math.round(clampedPosition * this.wallTextureSize);
        
        // Dessiner la partie bleue (côté gauche)
        ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
        ctx.fillRect(0, 0, divisionPixel, this.wallTextureSize);
        
        // Dessiner la partie mauve (côté droit)
        ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
        ctx.fillRect(divisionPixel, 0, this.wallTextureSize - divisionPixel, this.wallTextureSize);
        
        // Mettre à jour la texture sans générer de mipmaps
        this.trackingTexture.update(false);
    }

    public createPaddleDisintegrationEffect(playerIndex: number): void {
        console.log(`Création de l'effet de désintégration pour la raquette ${playerIndex} (depuis Pong - VERSION SANS SHOCKWAVE)`);
        
        // Déterminer quelle raquette a encaissé le goal (l'opposée de celui qui a marqué)
        const losingPlayerIndex = playerIndex === 0 ? 1 : 0;
        const paddle = losingPlayerIndex === 0 ? this.player0 : this.player1;
        
        // Sauvegarder la position de la raquette
        const paddlePosition = paddle.position.clone();
        
        // Rendre la raquette invisible temporairement
        paddle.isVisible = false;
        
        // Créer un système de particules - QUANTITÉ AUGMENTÉE DE 30%
        const paddleParticles = new ParticleSystem("paddleDisintegration", 520, this.scene); // 400 * 1.3 = 520
        
        // Définir la texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        paddleParticles.particleTexture = particleTexture;
        
        // Positionner l'émetteur à la position de la raquette
        paddleParticles.emitter = paddlePosition;
        
        // Zone d'émission originale complète
        paddleParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH * 1.5, -PLAYER_CONFIG.HEIGHT * 1.5, -PLAYER_CONFIG.DEPTH * 1.5);
        paddleParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH * 1.5, PLAYER_CONFIG.HEIGHT * 1.5, PLAYER_CONFIG.DEPTH * 1.5);
        
        // Couleurs des particules originales brillantes
        const mainColor = losingPlayerIndex === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        
        paddleParticles.color1 = new Color4(
            Math.min(1, mainColor.r * 2.0),  // BRILLANCE ORIGINALE
            Math.min(1, mainColor.g * 2.0), 
            Math.min(1, mainColor.b * 2.0), 
            1.0
        );
        paddleParticles.color2 = new Color4(
            Math.min(1, mainColor.r * 3.0),  // BRILLANCE ORIGINALE MAXIMALE
            Math.min(1, mainColor.g * 3.0), 
            Math.min(1, mainColor.b * 3.0), 
            1.0
        );
        paddleParticles.colorDead = new Color4(
            mainColor.r, 
            mainColor.g, 
            mainColor.b, 
            0
        );
        
        // Taille des particules originale
        paddleParticles.minSize = 0.8;   // TAILLE ORIGINALE
        paddleParticles.maxSize = 2.0;   // TAILLE ORIGINALE
        
        // Durée de vie originale
        paddleParticles.minLifeTime = 1.0;   // DURÉE ORIGINALE
        paddleParticles.maxLifeTime = 2.5;   // DURÉE ORIGINALE LONGUE
        
        // Vitesse et direction réduites de 20%
        const directionX = losingPlayerIndex === 0 ? -9.6 : 9.6;  // -12 * 0.8 = -9.6, 12 * 0.8 = 9.6
        paddleParticles.direction1 = new Vector3(directionX, -6.4, -6.4);   // -8 * 0.8 = -6.4
        paddleParticles.direction2 = new Vector3(directionX, 6.4, 6.4);     // 8 * 0.8 = 6.4
        
        // Puissance d'émission réduite de 20%
        paddleParticles.minEmitPower = 12;   // 15 * 0.8 = 12
        paddleParticles.maxEmitPower = 20;   // 25 * 0.8 = 20
        
        // Mode de fusion additif
        paddleParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Émetteur original
        paddleParticles.createBoxEmitter(
            new Vector3(-PLAYER_CONFIG.WIDTH * 1.5, -PLAYER_CONFIG.HEIGHT * 1.5, -PLAYER_CONFIG.DEPTH * 1.5),
            new Vector3(PLAYER_CONFIG.WIDTH * 1.5, PLAYER_CONFIG.HEIGHT * 1.5, PLAYER_CONFIG.DEPTH * 1.5),
            new Vector3(directionX, 0, 0),
            new Vector3(directionX, 0, 0)
        );
        
        // Rotation originale
        paddleParticles.minAngularSpeed = -3.0;  // ROTATION ORIGINALE
        paddleParticles.maxAngularSpeed = 3.0;   // ROTATION ORIGINALE
        
        // Quantité augmentée de 30%
        paddleParticles.emitRate = 0;
        paddleParticles.manualEmitCount = 455;  // 350 * 1.3 = 455
        
        // Démarrer les particules
        paddleParticles.start();
        
        // Nettoyage original avec timings longs
        setTimeout(() => {
            paddleParticles.stop();
            
            setTimeout(() => {
                paddle.isVisible = true;
            }, 800);  // TIMING ORIGINAL LONG
            setTimeout(() => {
                paddleParticles.dispose();
            }, 3000); // TIMING ORIGINAL TRÈS LONG
        }, 300); // TIMING ORIGINAL
    }

    public createBallDisintegrationEffect(playerScored: number): void {
        console.log(`Création de l'effet de désintégration pour le joueur ${playerScored}`);
        
        // Obtenir la position actuelle de la balle
        const ballPosition = this.ball.position.clone();
        
        // Créer un système de particules pour la désintégration - AUGMENTER légèrement
        const disintegrationParticles = new ParticleSystem("disintegrationParticles", 250, this.scene); // Augmenté de 200 à 250
        
        // Définir la texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        disintegrationParticles.particleTexture = particleTexture;
        
        // Positionner l'émetteur à la position actuelle de la balle
        disintegrationParticles.emitter = ballPosition;
        
        // Configurer la zone d'émission - Légèrement élargie
        disintegrationParticles.minEmitBox = new Vector3(-0.7, -0.7, -0.7); // Augmenté de -0.5 à -0.7
        disintegrationParticles.maxEmitBox = new Vector3(0.7, 0.7, 0.7);    // Augmenté de 0.5 à 0.7
        
        // Couleurs des particules basées sur le joueur qui a marqué
        const mainColor = playerScored === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        
        // Couleurs des particules avec variation - Plus brillantes
        disintegrationParticles.color1 = new Color4(
            Math.min(1, mainColor.r * 1.2), 
            Math.min(1, mainColor.g * 1.2), 
            Math.min(1, mainColor.b * 1.2), 
            1.0
        );
        disintegrationParticles.color2 = new Color4(
            Math.min(1, mainColor.r * 1.8), // Plus brillant
            Math.min(1, mainColor.g * 1.8), 
            Math.min(1, mainColor.b * 1.8), 
            1.0
        );
        disintegrationParticles.colorDead = new Color4(
            mainColor.r * 0.8, 
            mainColor.g * 0.8, 
            mainColor.b * 0.8, 
            0
        );
        
        // Taille des particules - Légèrement plus grandes
        disintegrationParticles.minSize = 0.15; // Augmenté de 0.1 à 0.15
        disintegrationParticles.maxSize = 0.5;  // Augmenté de 0.4 à 0.5
        
        // Durée de vie des particules - Plus longue
        disintegrationParticles.minLifeTime = 0.4; // Augmenté de 0.3 à 0.4
        disintegrationParticles.maxLifeTime = 1.0; // Augmenté de 0.8 à 1.0
        
        // Vitesse et direction des particules - Plus d'amplitude
        disintegrationParticles.direction1 = new Vector3(-6, -6, -6); // Augmenté de -5 à -6
        disintegrationParticles.direction2 = new Vector3(6, 6, 6);    // Augmenté de 5 à 6
        
        // Puissance d'émission - Plus forte
        disintegrationParticles.minEmitPower = 4; // Augmenté de 3 à 4
        disintegrationParticles.maxEmitPower = 10; // Augmenté de 8 à 10
        
        // Mode de fusion additif pour un effet lumineux
        disintegrationParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Créer un émetteur sphérique
        disintegrationParticles.createSphereEmitter(BALL_CONFIG.DIAMETER / 2);
        
        // Animation de rotation des particules
        disintegrationParticles.minAngularSpeed = -2.5; // Augmenté de -2.0 à -2.5
        disintegrationParticles.maxAngularSpeed = 2.5;  // Augmenté de 2.0 à 2.5
        
        // Vitesse d'émission et quantité de particules
        disintegrationParticles.emitRate = 0;
        disintegrationParticles.manualEmitCount = 200; // Augmenté de 150 à 200
        
        // Rendre la balle invisible immédiatement
        this.ball.isVisible = false;
        
        // Démarrer les particules
        disintegrationParticles.start();
        
        // Créer une onde de choc visuelle plus impressionnante
        this.createShockwaveEffect(ballPosition, playerScored);
        
        // Laisser les particules visibles plus longtemps
        setTimeout(() => {
            disintegrationParticles.stop();
            
            // Nettoyer les ressources après que les particules ont disparu
            setTimeout(() => {
                disintegrationParticles.dispose();
            }, 1200); // Augmenté de 1000 à 1200
        }, 150); // Augmenté de 100 à 150
    }

    private createShockwaveEffect(position: Vector3, playerScored: number): void {
        // Créer un anneau qui s'agrandit
        const shockwaveRing = MeshBuilder.CreateTorus(
            "shockwave", 
            { 
                diameter: BALL_CONFIG.DIAMETER * 0.5, 
                thickness: 0.4,
                tessellation: 32
            }, 
            this.scene
        );
        
        // Positionner l'onde de choc
        shockwaveRing.position = position;
        
        // Orienter le torus pour qu'il soit parallèle à la caméra (face à la caméra)
        shockwaveRing.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        
        // Créer un matériau pour l'anneau
        const shockwaveMaterial = new StandardMaterial("shockwaveMaterial", this.scene);
        
        // Couleur plus vive
        const baseColor = playerScored === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        // Créer une couleur plus brillante
        const brightColor = new Color3(
            Math.min(1, baseColor.r * 1.5),
            Math.min(1, baseColor.g * 1.5),
            Math.min(1, baseColor.b * 1.5)
        );
        
        shockwaveMaterial.emissiveColor = brightColor;
        shockwaveMaterial.alpha = 0.8;
        shockwaveMaterial.disableLighting = true;
        
        // Appliquer le matériau
        shockwaveRing.material = shockwaveMaterial;
        
        // Animation d'expansion
        const startScale = new Vector3(1, 1, 1);
        const endScale = new Vector3(12, 12, 1); // Expansion uniquement sur X et Y
        
        // Durée de l'animation en millisecondes
        const animationDuration = 600;
        const startTime = performance.now();
        
        // Fonction d'easing sans utiliser this
        const easeOutCubic = function(x: number): number {
            return 1 - Math.pow(1 - x, 3);
        };
        
        // Fonction d'animation
        const animateShockwave = function() {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            
            const easedProgress = easeOutCubic(progress);
            
            // Calculer l'échelle actuelle
            const currentScale = new Vector3(
                startScale.x + (endScale.x - startScale.x) * easedProgress,
                startScale.y + (endScale.y - startScale.y) * easedProgress,
                startScale.z
            );
            
            // Appliquer l'échelle
            shockwaveRing.scaling = currentScale;
            
            // Réduire l'opacité progressivement
            if (shockwaveRing.material && shockwaveRing.material instanceof StandardMaterial) {
                shockwaveRing.material.alpha = 0.8 * (1 - easedProgress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateShockwave);
            } else {
                // Nettoyer l'anneau à la fin de l'animation
                shockwaveRing.dispose();
            }
        };
        
        // Démarrer l'animation
        requestAnimationFrame(animateShockwave);
    }
}
