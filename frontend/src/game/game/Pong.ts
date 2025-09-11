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
import { apiClient } from "@/lib_front/api";

export class Pong {
    scene: Scene;
    engine: Engine;
    player0!: Mesh;
    player1!: Mesh;
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
    private _player2GlowLayer!: GlowLayer;
    private isGameStopped = false;
      private gameStartTime: number = 0;
    private isAIGame: boolean = false;
    private aiLevel: number | null = null;
    private aiDifficultyName: string = '';
    private gameMode: string = 'classic';

    private originalPlayer0Name: string = '';
    private originalPlayer1Name: string = '';

    constructor(private canvas: HTMLCanvasElement) {
        this.engine = new Engine(this.canvas, true);
        
        this.gameStartTime = Date.now();
        
        const gameMode = localStorage.getItem('game-mode');
        this.gameMode = gameMode || 'classic';
        
        console.log("Mode de jeu détecté:", this.gameMode);

        const getUserNames = () => {
            let currentUser = null;
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    currentUser = JSON.parse(storedUser);
                }
            } catch (e) {
                console.warn('Erreur lors de la récupération des données utilisateur:', e);
            }
            if (gameMode === 'tournament') {
                try {
                    const currentMatchData = localStorage.getItem('current-match');
                    if (currentMatchData) {
                        const matchData = JSON.parse(currentMatchData);
                        
                        const player0Name = matchData.player1?.name || matchData.player1?.display_name || matchData.player1?.username || "Player 0";
                        const player1Name = matchData.player2?.name || matchData.player2?.display_name || matchData.player2?.username || "Player 1";
                        return { player0Name, player1Name };
                    }
                } catch (e) {
                    console.warn('Erreur lors de la récupération des données du match tournament:', e);
                }

                return { 
                    player0Name: currentUser?.display_name || currentUser?.username || "Player 0", 
                    player1Name: "Player 1" 
                };
            }

            if (gameMode === 'duel') {
                try {
                    const duelPlayers = localStorage.getItem('duel-players');
                    if (duelPlayers) {
                        const players = JSON.parse(duelPlayers);
                        const player0Name = players[0]?.name || (currentUser?.display_name || currentUser?.username || "Player 0");
                        const player1Name = players[1]?.name || "Player 1";
                        return { player0Name, player1Name };
                    }
                } catch (e) {
                    console.warn('Erreur lors de la récupération des joueurs duel:', e);
                }

                const defaultPlayer0Name = currentUser?.display_name || currentUser?.username || "Player 0";
                return { player0Name: defaultPlayer0Name, player1Name: "Player 1" };
            }
            
            if (gameMode === 'multiplayer') {
                try {
                    const multiplayerPlayers = localStorage.getItem('multiplayer-players');
                    if (multiplayerPlayers) {
                        const players = JSON.parse(multiplayerPlayers);
                        const player0Name = players[0]?.name || (currentUser?.display_name || currentUser?.username || "Player 0");
                        const player1Name = players[2]?.name || "Player 2";
                        return { player0Name, player1Name };
                    }
                } catch (e) {
                    console.warn('Erreur lors de la récupération des joueurs multijoueur:', e);
                }
            }

            const defaultPlayer0Name = currentUser?.display_name || currentUser?.username || "Player 0";
            return { player0Name: defaultPlayer0Name, player1Name: "Player 1" };
        };

        const { player0Name, player1Name } = getUserNames();
        
        if (gameMode === 'ai') {
            this.isAIGame = true;
            const aiDifficulty = localStorage.getItem('ai-difficulty');
            switch (aiDifficulty?.toLowerCase()) {
                case 'easy':
                    this.aiLevel = 1;
                    this.aiDifficultyName = 'EASY';
                    this.gameMode = 'ai-easy';
                    break;
                case 'medium':
                    this.aiLevel = 2;
                    this.aiDifficultyName = 'MEDIUM';
                    this.gameMode = 'ai-medium';
                    break;
                case 'hard':
                    this.aiLevel = 3;
                    this.aiDifficultyName = 'HARD';
                    this.gameMode = 'ai-hard';
                    break;
                default:
                    this.aiLevel = 2;
                    this.aiDifficultyName = 'MEDIUM';
                    this.gameMode = 'ai-medium';
            }
            console.log(`Mode IA Difficulte: ${this.aiDifficultyName}`);
        }
          this.gameData = new PongData({
            maxScore: GAME_CONFIG.DEFAULT_MAX_SCORE,
            gameType: GameType.DEFAULT_PONG,
            player0Name: player0Name,
            player1Name: this.isAIGame ? `${this.aiDifficultyName} AI` : player1Name
        });

        this.originalPlayer0Name = this.gameData.player0Name;
        this.originalPlayer1Name = this.gameData.player1Name;
        console.log(`🎯 Noms originaux stockés: "${this.originalPlayer0Name}" / "${this.originalPlayer1Name}"`);
        
        this.scene = this.createScene();
        this.createScoreDisplays();
        this.createGameOverMessage();
        this.setupGameDataListeners();
        
        this.enableBarColorTracking();
        
        this.setGameMode(this.gameData.gameType);
        
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    private createScene(): Scene {
        const scene = new Scene(this.engine);

        scene.clearColor = new Color4(0.02, 0.02, 0.02, 1);
        
        const camera = new FreeCamera("camera", new Vector3(0, CAMERA_CONFIG.HEIGHT, 0), this.scene);
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);

        camera.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        hemiLight.intensity = LIGHT_CONFIG.INTENSITY;
        camera.attachControl();

        this.ball = MeshBuilder.CreateSphere("ball", {diameter: BALL_CONFIG.DIAMETER}, this.scene);
        this.ball.position = new Vector3(
            BALL_CONFIG.INITIAL_POSITION.X, 
            BALL_CONFIG.INITIAL_POSITION.Y, 
            BALL_CONFIG.INITIAL_POSITION.Z
        );
        
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

        this.topWallPlane = MeshBuilder.CreatePlane("topWallPlane", {
            width: WALL_CONFIG.WIDTH,
            height: 20
        }, this.scene);

        this.bottomWallPlane = MeshBuilder.CreatePlane("bottomWallPlane", {
            width: WALL_CONFIG.WIDTH,
            height: 20
        }, this.scene);

        this.createSplitColorMaterialForWalls(this.topWallPlane, this.bottomWallPlane);

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

        this.player0.position = new Vector3(
            PLAYER_CONFIG.PLAYER0_POSITION_X, 
            PLAYER_CONFIG.POSITION_Y, 
            300
        );
        
        this.player1.position = new Vector3(
            PLAYER_CONFIG.PLAYER1_POSITION_X, 
            PLAYER_CONFIG.POSITION_Y, 
            -300
        );

        this.glowLayer = new GlowLayer("ballGlow", this.scene);
        this.glowLayer.intensity = 1.0;
        this.glowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.glowLayer.addIncludedOnlyMesh(this.ball);

        this.player0GlowLayer = new GlowLayer("player0Glow", this.scene);
        this.player0GlowLayer.intensity = 0.8;
        this.player0GlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.player0GlowLayer.addIncludedOnlyMesh(this.player0);

        this.player1GlowLayer = new GlowLayer("player1Glow", this.scene);
        this.player1GlowLayer.intensity = 0.8;
        this.player1GlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.player1GlowLayer.addIncludedOnlyMesh(this.player1);

        this.topWallGlowLayer = new GlowLayer("topWallGlow", this.scene);
        this.topWallGlowLayer.intensity = 0.6;
        this.topWallGlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.topWallGlowLayer.addIncludedOnlyMesh(this.topWallPlane);

        this.bottomWallGlowLayer = new GlowLayer("bottomWallGlow", this.scene);
        this.bottomWallGlowLayer.intensity = 0.6;
        this.bottomWallGlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;
        this.bottomWallGlowLayer.addIncludedOnlyMesh(this.bottomWallPlane);

        this._player2GlowLayer = new GlowLayer("player2Glow", this.scene);
        this._player2GlowLayer.intensity = 0.8;
        this._player2GlowLayer.blurKernelSize = GAME_CONFIG.OPTIMIZATION.GLOW_BLUR_KERNEL;

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
        this.controls.setBallReference(this.ball);

        return scene;
    }

    public setGameMode(gameType: GameType): void {
        console.log("Pong.setGameMode() = ", gameType);
        
        if (this.currentGameMode) {
            console.log("🧹 Nettoyage du mode de jeu précédent:", this.currentGameMode.getType());
            this.currentGameMode.cleanup();
        }
        
        this.currentGameMode = GameModeFactory.createGameMode(gameType);
        
        const glowLayers = {
            ballGlowLayer: this.glowLayer,
            topWallGlowLayer: this.topWallGlowLayer,
            bottomWallGlowLayer: this.bottomWallGlowLayer,
            player0GlowLayer: this.player0GlowLayer,
            player1GlowLayer: this.player1GlowLayer
        };

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
            glowLayers,
            this.topWallPlane,
            this.bottomWallPlane
        );
        
        this.gameData.setGameType(gameType);
        
        if (this.scorePlayer0Mesh && this.scorePlayer1Mesh) {
            this.positionScoresForGameMode();
        }
        
        if (this.gameData.gameState === GameState.IDLE) {
            setTimeout(() => {
                this.gameData.startGame();
            }, 100);
        }
    }    public enableAI(difficulty: AIDifficulty = AIDifficulty.MEDIUM): void {
        this.controls.setupAI(difficulty);
        
        this.controls.activateAI();
        
        const currentDifficulty = this.controls.getAIDifficulty();
        const difficultyName = currentDifficulty ? this.getDifficultyName(currentDifficulty) : 'MEDIUM';
        
        const aiName = `${difficultyName} AI`;
        this.gameData.setPlayerNames(
            this.gameData.player0Name, 
            aiName
        );
        
        this.originalPlayer1Name = aiName;
        
        this.updateScoreDisplays(this.gameData.player0Score, this.gameData.player1Score);
    }

    public disableAI(): void {
        this.controls.deactivateAI();
        
        const defaultPlayer1Name = "Player 2";
        this.gameData.setPlayerNames(
            this.gameData.player0Name, 
            defaultPlayer1Name
        );

        this.originalPlayer1Name = defaultPlayer1Name;
        
        this.updateScoreDisplays(this.gameData.player0Score, this.gameData.player1Score);
    }    public setAIDifficulty(difficulty: AIDifficulty): void {
        this.controls.setAIDifficulty(difficulty);
        
        if (this.controls.isAIActive()) {
            const difficultyName = this.getDifficultyName(difficulty);
            const aiName = `${difficultyName} AI`;
            this.gameData.setPlayerNames(
                this.gameData.player0Name, 
                aiName
            );

            this.originalPlayer1Name = aiName;
            
            this.updateScoreDisplays(this.gameData.player0Score, this.gameData.player1Score);
        }
    }

    private getDifficultyName(difficulty: AIDifficulty): string {
        return getDifficultyName(difficulty);
    }

    public isAIEnabled(): boolean {
        return this.controls.isAIActive();
    }

    public animatePlayerGlow(playerIndex: number): void {
        let player: Mesh;
        let playerGlowLayer: GlowLayer;
        let originalEmissiveColor: Color3;

        if (playerIndex === 0) {
            player = this.player0;
            playerGlowLayer = this.player0GlowLayer;
            originalEmissiveColor = MAIN_COLORS.RGB_BLUE.scale(0.5);
        } else if (playerIndex === 1) {
            player = this.player1;
            playerGlowLayer = this.player1GlowLayer;
            originalEmissiveColor = MAIN_COLORS.RGB_PURPLE.scale(0.5);
        } else if (playerIndex === 2) {
            const centerPaddle = this.scene.getMeshByName("centerPaddle") as Mesh;
            if (!centerPaddle || !this._player2GlowLayer) {
                console.error("Paddle centrale ou glow layer non trouvé");
                return;
            }
            player = centerPaddle;
            playerGlowLayer = this._player2GlowLayer;
            originalEmissiveColor = MAIN_COLORS.RGB_GREEN.scale(0.5);
        } else {
            return;
        }
        
        if (!player || !playerGlowLayer) {
            return;
        }

        const originalGlowIntensity = playerGlowLayer.intensity;
        const material = player.material as StandardMaterial;
        const currentEmissiveColor = material.emissiveColor ? material.emissiveColor.clone() : originalEmissiveColor;

        material.emissiveColor = new Color3(1, 1, 1);
        playerGlowLayer.intensity = 2.0;

        this.createPlayerImpactParticles(playerIndex);

        const startTime = performance.now();
        const animationDuration = 500;
        
        const animate = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            
            if (progress < 1) {
                const interpolatedEmissiveColor = new Color3(
                    1 - progress * (1 - currentEmissiveColor.r),
                    1 - progress * (1 - currentEmissiveColor.g),
                    1 - progress * (1 - currentEmissiveColor.b)
                );
                
                material.emissiveColor = interpolatedEmissiveColor;
                playerGlowLayer.intensity = 2.0 - (progress * (2.0 - originalGlowIntensity));
                
                requestAnimationFrame(animate);
            } else {
                material.emissiveColor = currentEmissiveColor;
                playerGlowLayer.intensity = originalGlowIntensity;
            }
        };
        
        requestAnimationFrame(animate);
    }

    private createPlayerImpactParticles(playerIndex: number): void {
        let player: Mesh;
        let playerColor: Color3;

        if (playerIndex === 0) {
            player = this.player0;
            playerColor = MAIN_COLORS.RGB_BLUE;
        } else if (playerIndex === 1) {
            player = this.player1;
            playerColor = MAIN_COLORS.RGB_PURPLE;
        } else if (playerIndex === 2) {
            const centerPaddle = this.scene.getMeshByName("centerPaddle") as Mesh;
            if (!centerPaddle) {
                return;
            }
            player = centerPaddle;
            playerColor = MAIN_COLORS.RGB_GREEN;
        } else {
            return;
        }
        
        const impactParticles = new ParticleSystem("playerImpactParticles", 50, this.scene);
        
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        impactParticles.particleTexture = particleTexture;
        impactParticles.emitter = player.position.clone();

        impactParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH/2, -PLAYER_CONFIG.HEIGHT/2, -PLAYER_CONFIG.DEPTH/2);
        impactParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH/2, PLAYER_CONFIG.HEIGHT/2, PLAYER_CONFIG.DEPTH/2);

        impactParticles.color1 = new Color4(
            Math.min(1, playerColor.r * 2.0),
            Math.min(1, playerColor.g * 2.0),
            Math.min(1, playerColor.b * 2.0),
            1.0
        );
        impactParticles.color2 = new Color4(1, 1, 1, 1.0);
        impactParticles.colorDead = new Color4(playerColor.r, playerColor.g, playerColor.b, 0);

        impactParticles.minSize = 0.2;
        impactParticles.maxSize = 0.8;
        impactParticles.minLifeTime = 0.2;
        impactParticles.maxLifeTime = 0.5;
        impactParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        if (playerIndex === 0) {
            impactParticles.direction1 = new Vector3(-2, -2, -2);
            impactParticles.direction2 = new Vector3(-2, 2, 2);
        } else if (playerIndex === 1) {
            impactParticles.direction1 = new Vector3(2, -2, -2);
            impactParticles.direction2 = new Vector3(2, 2, 2);
        } else if (playerIndex === 2) {
            impactParticles.direction1 = new Vector3(-3, -2, -3);
            impactParticles.direction2 = new Vector3(3, 2, 3);
        }
        
        impactParticles.createSphereEmitter(2.0);
        impactParticles.minEmitPower = 3;
        impactParticles.maxEmitPower = 8;
        impactParticles.gravity = new Vector3(0, -1, 0);

        impactParticles.emitRate = 0;
        impactParticles.manualEmitCount = 30;

        impactParticles.start();

        setTimeout(() => {
            impactParticles.stop();
            setTimeout(() => {
                impactParticles.dispose();
            }, 500);
        }, 100);
    }

    private createSplitColorMaterialForWalls(topWallPlane: Mesh, bottomWallPlane: Mesh): void {
        topWallPlane.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        bottomWallPlane.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);

        topWallPlane.position = new Vector3(
            0, 
            WALL_CONFIG.POSITION_Y + 2,
            WALL_CONFIG.TOP_POSITION_Z
        );
        
        bottomWallPlane.position = new Vector3(
            0, 
            WALL_CONFIG.POSITION_Y + 2,
            WALL_CONFIG.BOTTOM_POSITION_Z
        );

        const wallMaterial = new StandardMaterial("wallMaterial", this.scene);

        this.wallTextureSize = 512;
        this.wallOriginalTexture = new DynamicTexture(
            "wallTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );
        
        const context = this.wallOriginalTexture.getContext() as unknown as CanvasRenderingContext2D;

        context.imageSmoothingEnabled = false;

        context.fillStyle = MAIN_COLORS.HEX_BLUE;
        context.fillRect(0, 0, this.wallTextureSize / 2, this.wallTextureSize);

        context.fillStyle = MAIN_COLORS.HEX_PURPLE;
        context.fillRect(this.wallTextureSize / 2, 0, this.wallTextureSize / 2, this.wallTextureSize);
        

        this.wallOriginalTexture.update(false);

        wallMaterial.diffuseTexture = this.wallOriginalTexture;
        wallMaterial.emissiveTexture = this.wallOriginalTexture;
        wallMaterial.emissiveColor = new Color3(0.7, 0.7, 0.7);
        wallMaterial.specularColor = new Color3(0.2, 0.2, 0.2);

        topWallPlane.material = wallMaterial;
        bottomWallPlane.material = wallMaterial;
    }

    private createScoreDisplays(): void {
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

        const scorePlayer0Material = new StandardMaterial("scoreMat0", this.scene);
        scorePlayer0Material.diffuseTexture = this.scorePlayer0Texture;
        scorePlayer0Material.emissiveTexture = this.scorePlayer0Texture;
        scorePlayer0Material.emissiveColor = MAIN_COLORS.RGB_BLUE;
        scorePlayer0Material.specularColor = new Color3(0.2, 0.2, 0.2);
        scorePlayer0Material.useAlphaFromDiffuseTexture = true;
        scorePlayer0Material.backFaceCulling = false;
        
        const scorePlayer1Material = new StandardMaterial("scoreMat1", this.scene);
        scorePlayer1Material.diffuseTexture = this.scorePlayer1Texture;
        scorePlayer1Material.emissiveTexture = this.scorePlayer1Texture;
        scorePlayer1Material.emissiveColor = MAIN_COLORS.RGB_PURPLE;
        scorePlayer1Material.specularColor = new Color3(0.2, 0.2, 0.2);
        scorePlayer1Material.useAlphaFromDiffuseTexture = true;
        scorePlayer1Material.backFaceCulling = false;

        this.scorePlayer0Mesh = MeshBuilder.CreatePlane(
            "scoreDisplay0", 
            { width: GAME_CONFIG.DISPLAY.SCORE_PLANE_WIDTH, height: GAME_CONFIG.DISPLAY.SCORE_PLANE_HEIGHT }, 
            this.scene
        );
        
        this.scorePlayer1Mesh = MeshBuilder.CreatePlane(
            "scoreDisplay1", 
            { width: GAME_CONFIG.DISPLAY.SCORE_PLANE_WIDTH, height: GAME_CONFIG.DISPLAY.SCORE_PLANE_HEIGHT }, 
            this.scene
        );

        this.positionScoresForGameMode();
        
        this.scorePlayer0Mesh.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        this.scorePlayer0Mesh.material = scorePlayer0Material;
        
        this.scorePlayer1Mesh.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        this.scorePlayer1Mesh.material = scorePlayer1Material;

        this.updateScoreDisplays(0, 0);
    }

    private positionScoresForGameMode(): void {
        if (this.gameData.gameType === GameType.MULTIPLAYER_PONG) {
            this.scorePlayer0Mesh.position = new Vector3(
                0,
                GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_Y,
                2500
            );

            this.scorePlayer1Mesh.position = new Vector3(
                0,
                GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_Y,
                2500
            );
        } else {
            this.scorePlayer0Mesh.position = new Vector3(
                -GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_X_OFFSET, 
                GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_Y, 
                0
            );
            
            this.scorePlayer1Mesh.position = new Vector3(
                GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_X_OFFSET, 
                GAME_CONFIG.DISPLAY.SCORE_PLANE_POSITION_Y, 
                0
            );
        }
    }    private updateScoreDisplays(score0: number, score1: number): void {
        this.forceUpdateScoreDisplays(
            score0, 
            score1, 
            this.originalPlayer0Name, 
            this.originalPlayer1Name
        );
    }

    private createGameOverMessage(): void {
        this.gameOverTexture = new DynamicTexture(
            "gameOverTexture", 
            { width: 1024, height: 512 }, 
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
            { width: 600, height: 300 }, 
            this.scene
        );
        
        this.gameOverMesh.position = new Vector3(0, 150, 0);
        this.gameOverMesh.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);
        this.gameOverMesh.material = gameOverMaterial;
        this.gameOverMesh.isVisible = false;
    }

    private showGameOverMessage(): void {
        let winnerName: string;

        if (this.gameData.gameType === GameType.MULTIPLAYER_PONG) {
            try {
                const multiplayerPlayers = localStorage.getItem('multiplayer-players');
                if (multiplayerPlayers) {
                    const players = JSON.parse(multiplayerPlayers);
                    
                    if (this.gameData.winner === 0) {
                        const hostName = players[0]?.name || "Player 0";
                        const player1Name = players[1]?.name || "Player 1";
                        winnerName = `${hostName} & ${player1Name}`;
                    } else {
                        winnerName = players[2]?.name || "Player 2";
                    }
                } else {
                    winnerName = this.gameData.winner === 0 ? "TEAM" : "PLAYER 2";
                }
            } catch (e) {
                winnerName = this.gameData.winner === 0 ? "TEAM" : "PLAYER 2";
            }
        } else {
            winnerName = this.gameData.winner === 0 ? 
                this.gameData.player0Name : 
                this.gameData.player1Name;
        }
        
        if (winnerName.length > 20) {
            winnerName = winnerName.substring(0, 20) + "...";
        }
        
        const context = this.gameOverTexture.getContext() as unknown as CanvasRenderingContext2D;
        
        context.clearRect(0, 0, 1024, 512);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        context.font = 'bold 28px Arial';
        context.fillStyle = '#FFD700';
        context.fillText(`${winnerName}`, 512, 200);
        
        context.font = 'bold 26px Arial';
        context.fillStyle = '#FFFFFF';
        context.fillText('has won!', 512, 280);
        
        this.gameOverTexture.update();
        this.gameOverTexture.hasAlpha = true;
        this.gameOverMesh.isVisible = true;
    }    private setupGameDataListeners(): void {
        let prevScorePlayer0 = 0;
        let prevScorePlayer1 = 0;        this.gameData.on(GameEvents.SCORE_CHANGED, (scores: { player0: number; player1: number }) => {
            
            this.forceUpdateScoreDisplays(
                scores.player0, 
                scores.player1, 
                this.originalPlayer0Name, 
                this.originalPlayer1Name
            );
            
            this.scorePlayer0Mesh.isVisible = true;
            this.scorePlayer1Mesh.isVisible = true;
            
            if (scores.player0 > prevScorePlayer0) {
                this.barColorTrackingActive = false;
                if (scores.player0 >= this.gameData.maxScore) {
                    this.animateWallColorTransitionFinal(0);
                } else {
                    this.animateWallColorTransition(0);
                }
            } else if (scores.player1 > prevScorePlayer1) {
                this.barColorTrackingActive = false;
                if (scores.player1 >= this.gameData.maxScore) {
                    this.animateWallColorTransitionFinal(1);
                } else {
                    this.animateWallColorTransition(1);
                }
            }
            prevScorePlayer0 = scores.player0;
            prevScorePlayer1 = scores.player1;
        });

        this.gameData.on(GameEvents.PLAYER_WON, (winner: number, winnerName: string) => {
            if (this.isGameStopped) {
                return;
            }
            
            if (this.gameMode === 'multiplayer') {
                this.showGameOverMessage();
                setTimeout(() => {
                    if (this.gameOverMesh.isVisible) {
                        this.scorePlayer0Mesh.isVisible = false;
                        this.scorePlayer1Mesh.isVisible = false;
                    }
                }, 100);
                setTimeout(() => {
                    this.gameOverMesh.isVisible = false;
                    setTimeout(() => {
                        this.stopGame();
                    }, 500);
                }, GAME_CONFIG.RESET_DELAY_MS);
                
                return;
            }

            if (this.gameMode === 'tournament') {
                const gameEndTime = Date.now();
                const duration = Math.round((gameEndTime - this.gameStartTime) / 1000);

                const currentMatchData = localStorage.getItem('current-match');
                if (currentMatchData) {
                    try {
                        const matchData = JSON.parse(currentMatchData);
                        
                        console.log('🏆 Données du match récupérées:', {
                            matchId: matchData.id,
                            tournamentId: matchData.tournamentId,
                            player1: matchData.player1,
                            player2: matchData.player2,
                            scores: `${this.gameData.player0Score}-${this.gameData.player1Score}`,
                            winner: winner,
                            duration: duration
                        });
                        const winnerId = winner === 0 ? matchData.player1.id : matchData.player2.id;
                        const tournamentMatchResult = {
                            scorePlayer1: this.gameData.player0Score,
                            scorePlayer2: this.gameData.player1Score,
                            winnerId: winnerId
                        };
                        
                        apiClient.completeMatch(matchData.id, tournamentMatchResult)
                            .then((response) => {
                                console.log('Match tournoi sauvegardé avec succès:', response);
                                localStorage.setItem('match-completed', 'true');

                                this.showGameOverMessage();

                                setTimeout(() => {
                                    this.gameOverMesh.isVisible = false;
                                    setTimeout(() => {
                                        this.stopGame();
                                    }, 500);
                                }, GAME_CONFIG.RESET_DELAY_MS);
                            })
                            .catch((error) => {
                                console.error('Erreur lors de la sauvegarde du match tournament:', error);
                                localStorage.setItem('match-completed', 'true');
                                
                                this.showGameOverMessage();
                                setTimeout(() => {
                                    this.gameOverMesh.isVisible = false;
                                    setTimeout(() => {
                                        this.stopGame();
                                    }, 500);
                                }, GAME_CONFIG.RESET_DELAY_MS);
                            });
                    } catch (e) {
                        localStorage.setItem('match-completed', 'true');

                        this.showGameOverMessage();
                        setTimeout(() => {
                            this.gameOverMesh.isVisible = false;
                            setTimeout(() => {
                                console.log("Erreur parsing - retour au bracket");
                                this.stopGame();
                            }, 500);
                        }, GAME_CONFIG.RESET_DELAY_MS);
                    }
                } else {
                    localStorage.setItem('match-completed', 'true');
                    this.showGameOverMessage();
                    setTimeout(() => {
                        this.gameOverMesh.isVisible = false;
                        setTimeout(() => {
                            console.log("Pas de données de match - retour au bracket");
                            this.stopGame();
                        }, 500);
                    }, GAME_CONFIG.RESET_DELAY_MS);
                }
                
                return;
            }
            const gameEndTime = Date.now();
            const duration = Math.round((gameEndTime - this.gameStartTime) / 1000);

            const gameResult = {
                score_player1: this.gameData.player0Score,
                score_player2: this.gameData.player1Score,
                winner_id: this.isAIGame ? 
                    (winner === 0 ? 1 : null) :
                    (winner === 0 ? 1 : 2),
                duration: duration,
                game_mode: this.gameMode,
                ai_opponent: this.isAIGame,
                ai_level: this.aiLevel,
                player2_id: this.isAIGame ? null : 2,
                tournament_id: null
            };
            apiClient.completeGame(gameResult)
                .then((response) => {
                    console.log('Partie sauvegardée avec succès:', response);
                })
                .catch((error) => {
                    console.error('Erreur lors de la sauvegarde:', error);
                });

            setTimeout(() => {
                if (this.gameOverMesh.isVisible) {
                    this.scorePlayer0Mesh.isVisible = false;
                    this.scorePlayer1Mesh.isVisible = false;
                }
            }, 100);
            this.showGameOverMessage();

            setTimeout(() => {
                this.gameOverMesh.isVisible = false;
                setTimeout(() => {
                    this.stopGame();
                }, 500);
            }, GAME_CONFIG.RESET_DELAY_MS);
        });

        this.gameData.on('PLAYERS_REPOSITIONED', () => {
            this.scorePlayer0Mesh.isVisible = true;
            this.scorePlayer1Mesh.isVisible = true;

            if (this.finalAnimationActive) {
                this.endFinalAnimation();
            } 
            else if (this.animatingWallColor) {
                this.animatingWallColor = false;
                this.barColorTrackingActive = true;
            }
            else {
                this.barColorTrackingActive = true;
                this.updateBarColorBasedOnBallPosition();
            }
        });

        this.gameData.on(GameEvents.GAME_STATE_CHANGED, (state: GameState) => {
            if (state === GameState.PLAYING) {
            this.gameOverMesh.isVisible = false;
            
            this.scorePlayer0Mesh.isVisible = true;
            this.scorePlayer1Mesh.isVisible = true;
            }
        });
        
        this.gameData.on(GameEvents.GAME_RESET, () => {
            this.gameOverMesh.isVisible = false;

            if (this.controls.isAIActive()) {
                this.controls.resetAI();
            }

            this.updateScoreDisplays(0, 0);
            this.scorePlayer0Mesh.isVisible = true;
            this.scorePlayer1Mesh.isVisible = true;
            this.animatingWallColor = false;
            if (this.finalAnimationActive) {
                this.endFinalAnimation();
            }
            
            const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
            const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
            
            if (topWallPlane && bottomWallPlane && (topWallPlane.material instanceof StandardMaterial)) {
                this.barColorTrackingActive = true;
                setTimeout(() => {
                    if (this.barColorTrackingActive) {
                        this.updateBarColorBasedOnBallPosition();
                    }
                }, 100);
            }
        });
    }

    private forceUpdateScoreDisplays(score0: number, score1: number, forcedName0: string, forcedName1: string): void {
        if (!this.scorePlayer0Texture || !this.scorePlayer1Texture) {
            return;
        }

        const context0 = this.scorePlayer0Texture.getContext() as unknown as CanvasRenderingContext2D;
        const context1 = this.scorePlayer1Texture.getContext() as unknown as CanvasRenderingContext2D;

        if (!context0 || !context1) {
            return;
        } 

        context0.clearRect(0, 0, GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE, GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE);
        context1.clearRect(0, 0, GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE, GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE);

        context0.textAlign = 'center';
        context0.textBaseline = 'middle';
        context1.textAlign = 'center';
        context1.textBaseline = 'middle';
        
        const fontSize = 16;
        const font = `bold ${fontSize}px Arial`;
        const smallerFont = `bold ${fontSize}px Arial`;

        let displayName0 = forcedName0 || "Player 0";
        let displayName1 = forcedName1 || "Player 1";
        
        if (displayName0.length > 9) {
            displayName0 = displayName0.substring(0, 9) + "...";
        }
        if (displayName1.length > 9) {
            displayName1 = displayName1.substring(0, 9) + "...";
        }

        context0.font = font;
        context0.fillStyle = MAIN_COLORS.HEX_BLUE;
        context0.fillText(
            score0.toString(), 
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2, 
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2
        );
        
        context0.font = smallerFont;
        context0.fillStyle = MAIN_COLORS.HEX_BLUE;
        context0.fillText(
            displayName0,
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2,
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2 + fontSize/2 + 15
        );

        context1.font = font;
        context1.fillStyle = MAIN_COLORS.HEX_PURPLE;
        context1.fillText(
            score1.toString(), 
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2, 
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2
        );

        context1.font = smallerFont;
        context1.fillStyle = MAIN_COLORS.HEX_PURPLE;
        context1.fillText(
            displayName1,
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2,
            GAME_CONFIG.DISPLAY.SCORE_TEXTURE_SIZE / 2 + fontSize/2 + 15
        );

        this.scorePlayer0Texture.update(true);
        this.scorePlayer1Texture.update(true);
        this.scorePlayer0Texture.hasAlpha = true;
        this.scorePlayer1Texture.hasAlpha = true;
    }

    private animateWallColorTransition(player: number): void {
        if (this.animatingWallColor) {
            return;
        }
        
        this.animatingWallColor = true;
        const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
        const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
        
        if (!topWallPlane || !bottomWallPlane) {
            this.animatingWallColor = false;
            return;
        }
        
        if (!(topWallPlane.material instanceof StandardMaterial)) {
            this.animatingWallColor = false;
            return;
        }
        
        const wallMaterial = topWallPlane.material as StandardMaterial;
        const animTexture = new DynamicTexture(
            "wallAnimTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );
        
        const ctx = animTexture.getContext() as unknown as CanvasRenderingContext2D;
        ctx.imageSmoothingEnabled = false;

        const phaseDurations = {
            hold: 1000,
            returnToMid: 200
        };
        
        const totalDuration = phaseDurations.hold + phaseDurations.returnToMid;
        const startTime = performance.now();

        const easeInOut = (t: number): number => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const drawTransition = (elapsedTime: number): void => {
            ctx.clearRect(0, 0, this.wallTextureSize, this.wallTextureSize);
            
            if (elapsedTime < phaseDurations.hold) {
                if (player === 0) {
                    ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
                    ctx.fillRect(0, 0, this.wallTextureSize, this.wallTextureSize);
                } else {
                    ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
                    ctx.fillRect(0, 0, this.wallTextureSize, this.wallTextureSize);
                }
            } 
            else {
                const phaseElapsed = elapsedTime - phaseDurations.hold;
                const progress = easeInOut(phaseElapsed / phaseDurations.returnToMid);
                
                if (player === 0) {
                    const blueWidth = this.wallTextureSize * (1 - progress * 0.5);

                    ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
                    ctx.fillRect(0, 0, blueWidth, this.wallTextureSize);
                    ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
                    ctx.fillRect(blueWidth, 0, this.wallTextureSize - blueWidth, this.wallTextureSize);
                } else {
                    const purpleStart = this.wallTextureSize * progress * 0.5;
                    
                    ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
                    ctx.fillRect(0, 0, purpleStart, this.wallTextureSize);

                    ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
                    ctx.fillRect(purpleStart, 0, this.wallTextureSize - purpleStart, this.wallTextureSize);
                }
            }
        };

        const animate = () => {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            
            if (elapsedTime < totalDuration) {
                drawTransition(elapsedTime);

                animTexture.update(false);
                wallMaterial.diffuseTexture = animTexture;
                wallMaterial.emissiveTexture = animTexture;
                wallMaterial.markAsDirty(Material.TextureDirtyFlag);

                requestAnimationFrame(animate);
            } else {

                console.log("Animation terminée");
                
                try {
                    const transitionTexture = new DynamicTexture(
                        "transitionTexture", 
                        { width: this.wallTextureSize, height: this.wallTextureSize }, 
                        this.scene, 
                        false,
                        Texture.NEAREST_SAMPLINGMODE
                    );
                    
                    const transCtx = transitionTexture.getContext() as unknown as CanvasRenderingContext2D;
                    transCtx.imageSmoothingEnabled = false;
                    transCtx.fillStyle = MAIN_COLORS.HEX_BLUE;
                    transCtx.fillRect(0, 0, this.wallTextureSize / 2, this.wallTextureSize);
                    
                    transCtx.fillStyle = MAIN_COLORS.HEX_PURPLE;
                    transCtx.fillRect(this.wallTextureSize / 2, 0, this.wallTextureSize / 2, this.wallTextureSize);
                    
                    transitionTexture.update(false);
                    
                    wallMaterial.diffuseTexture = transitionTexture;
                    wallMaterial.emissiveTexture = transitionTexture;
                    wallMaterial.markAsDirty(Material.TextureDirtyFlag);

                    animTexture.dispose();

                    setTimeout(() => {
                        this.animatingWallColor = false;
                        
                        this.barColorTrackingActive = true;

                        if (this.trackingTexture) {
                            wallMaterial.diffuseTexture = this.trackingTexture;
                            wallMaterial.emissiveTexture = this.trackingTexture;
                            wallMaterial.markAsDirty(Material.TextureDirtyFlag);

                            this.updateBarColorBasedOnBallPosition();

                            transitionTexture.dispose();
                        }
                        
                    }, 50);
                } catch (error) {
                    console.error("Erreur lors de la fin de l'animation:", error);
                    this.animatingWallColor = false;
                    this.barColorTrackingActive = true;

                    this.enableBarColorTracking();
                }
            }
        };

        animate();
    }

    private animateWallColorTransitionFinal(player: number): void {
        console.log(`Début d'animation finale pour le joueur ${player}`);

        if (this.animatingWallColor) {
            this.animatingWallColor = false;
        }
        
        this.finalAnimationActive = true;
        this.finalAnimationPlayer = player;

        const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
        const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
        
        if (!topWallPlane || !bottomWallPlane || !(topWallPlane.material instanceof StandardMaterial)) {
            console.error("Murs non trouvés ou matériau incorrect");
            this.finalAnimationActive = false;
            return;
        }
        
        const wallMaterial = topWallPlane.material as StandardMaterial;

        this.finalAnimationTexture = new DynamicTexture(
            "finalWallTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );

        const ctx = this.finalAnimationTexture.getContext() as unknown as CanvasRenderingContext2D;
        ctx.imageSmoothingEnabled = false;

        if (player === 0) {
            ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
            ctx.fillRect(0, 0, this.wallTextureSize, this.wallTextureSize);
        } else {
            ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
            ctx.fillRect(0, 0, this.wallTextureSize, this.wallTextureSize);
        }
        
        this.finalAnimationTexture.update(false);
        wallMaterial.diffuseTexture = this.finalAnimationTexture;
        wallMaterial.emissiveTexture = this.finalAnimationTexture;
        wallMaterial.markAsDirty(Material.TextureDirtyFlag);
    }

    private endFinalAnimation(): void {
        if (!this.finalAnimationActive || !this.finalAnimationTexture) {
            return;
        }
        
        const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
        const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
        
        if (!topWallPlane || !bottomWallPlane || !(topWallPlane.material instanceof StandardMaterial)) {
            return;
        }
        
        const wallMaterial = topWallPlane.material as StandardMaterial;
        
        const finalTexture = new DynamicTexture(
            "resetWallTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );
        
        const finalCtx = finalTexture.getContext() as unknown as CanvasRenderingContext2D;
        finalCtx.imageSmoothingEnabled = false;

        finalCtx.fillStyle = MAIN_COLORS.HEX_BLUE;
        finalCtx.fillRect(0, 0, this.wallTextureSize / 2, this.wallTextureSize);

        finalCtx.fillStyle = MAIN_COLORS.HEX_PURPLE;
        finalCtx.fillRect(this.wallTextureSize / 2, 0, this.wallTextureSize / 2, this.wallTextureSize);
        
        finalTexture.update(false);

        wallMaterial.diffuseTexture = finalTexture;
        wallMaterial.emissiveTexture = finalTexture;
        wallMaterial.markAsDirty(Material.TextureDirtyFlag);

        this.finalAnimationTexture.dispose();
        this.finalAnimationTexture = null;

        this.finalAnimationActive = false;
        this.finalAnimationPlayer = -1;
    }

    private enableBarColorTracking(): void {
        if (this.barColorTrackingActive) return;
        
        this.barColorTrackingActive = true;
        
        this.trackingTexture = new DynamicTexture(
            "trackingTexture", 
            { width: this.wallTextureSize, height: this.wallTextureSize }, 
            this.scene, 
            false,
            Texture.NEAREST_SAMPLINGMODE
        );

        const topWallPlane = this.scene.getMeshByName("topWallPlane") as Mesh;
        const bottomWallPlane = this.scene.getMeshByName("bottomWallPlane") as Mesh;
        
        if (!topWallPlane || !bottomWallPlane || !(topWallPlane.material instanceof StandardMaterial)) {
            this.barColorTrackingActive = false;
            return;
        }

        const wallMaterial = topWallPlane.material as StandardMaterial;

        wallMaterial.diffuseTexture = this.trackingTexture;
        wallMaterial.emissiveTexture = this.trackingTexture;

        let lastUpdate = 0;
        const updateInterval = 16;
        
        this.scene.registerBeforeRender(() => {
            const now = performance.now();
            if (now - lastUpdate < updateInterval || !this.barColorTrackingActive) return;
            lastUpdate = now;

            if (this.gameData.gameState === GameState.GAME_OVER || !this.ball.isVisible) return;

            if (this.finalAnimationActive) return;
            
            this.updateBarColorBasedOnBallPosition();
        });
    }

    private updateBarColorBasedOnBallPosition(): void {
        if (!this.trackingTexture) return;
        
        const ctx = this.trackingTexture.getContext() as unknown as CanvasRenderingContext2D;
        ctx.imageSmoothingEnabled = false;

        const wallWidth = WALL_CONFIG.WIDTH;
        const wallHalfWidth = wallWidth / 2;

        const normalizedPosition = (this.ball.position.x + wallHalfWidth) / wallWidth;

        const clampedPosition = Math.max(0, Math.min(1, normalizedPosition));

        const divisionPixel = Math.round(clampedPosition * this.wallTextureSize);

        ctx.fillStyle = MAIN_COLORS.HEX_BLUE;
        ctx.fillRect(0, 0, divisionPixel, this.wallTextureSize);

        ctx.fillStyle = MAIN_COLORS.HEX_PURPLE;
        ctx.fillRect(divisionPixel, 0, this.wallTextureSize - divisionPixel, this.wallTextureSize);

        this.trackingTexture.update(false);
    }

    public createPaddleDisintegrationEffect(playerIndex: number): void {

        const losingPlayerIndex = playerIndex === 0 ? 1 : 0;
        const paddle = losingPlayerIndex === 0 ? this.player0 : this.player1;
        const paddlePosition = paddle.position.clone();

        paddle.isVisible = false;
        const paddleParticles = new ParticleSystem("paddleDisintegration", 520, this.scene);

        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        paddleParticles.particleTexture = particleTexture;

        paddleParticles.emitter = paddlePosition;
        
        paddleParticles.minEmitBox = new Vector3(-PLAYER_CONFIG.WIDTH * 1.5, -PLAYER_CONFIG.HEIGHT * 1.5, -PLAYER_CONFIG.DEPTH * 1.5);
        paddleParticles.maxEmitBox = new Vector3(PLAYER_CONFIG.WIDTH * 1.5, PLAYER_CONFIG.HEIGHT * 1.5, PLAYER_CONFIG.DEPTH * 1.5);

        const mainColor = losingPlayerIndex === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        
        paddleParticles.color1 = new Color4(
            Math.min(1, mainColor.r * 2.0),
            Math.min(1, mainColor.g * 2.0), 
            Math.min(1, mainColor.b * 2.0), 
            1.0
        );
        paddleParticles.color2 = new Color4(
            Math.min(1, mainColor.r * 3.0),
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

        paddleParticles.minSize = 0.8;
        paddleParticles.maxSize = 2.0;

        paddleParticles.minLifeTime = 1.0;
        paddleParticles.maxLifeTime = 2.5;

        const directionX = losingPlayerIndex === 0 ? -9.6 : 9.6;
        paddleParticles.direction1 = new Vector3(directionX, -6.4, -6.4);
        paddleParticles.direction2 = new Vector3(directionX, 6.4, 6.4);

        paddleParticles.minEmitPower = 12;
        paddleParticles.maxEmitPower = 20;

        paddleParticles.blendMode = ParticleSystem.BLENDMODE_ADD;

        paddleParticles.createBoxEmitter(
            new Vector3(-PLAYER_CONFIG.WIDTH * 1.5, -PLAYER_CONFIG.HEIGHT * 1.5, -PLAYER_CONFIG.DEPTH * 1.5),
            new Vector3(PLAYER_CONFIG.WIDTH * 1.5, PLAYER_CONFIG.HEIGHT * 1.5, PLAYER_CONFIG.DEPTH * 1.5),
            new Vector3(directionX, 0, 0),
            new Vector3(directionX, 0, 0)
        );

        paddleParticles.minAngularSpeed = -3.0;
        paddleParticles.maxAngularSpeed = 3.0;

        paddleParticles.emitRate = 0;
        paddleParticles.manualEmitCount = 455;

        paddleParticles.start();

        setTimeout(() => {
            paddleParticles.stop();
            
            setTimeout(() => {
                paddle.isVisible = true;
            }, 800);
            setTimeout(() => {
                paddleParticles.dispose();
            }, 3000);
        }, 300);
    }

    public createBallDisintegrationEffect(playerScored: number): void {

        const ballPosition = this.ball.position.clone();
        
        const disintegrationParticles = new ParticleSystem("disintegrationParticles", 250, this.scene);

        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        disintegrationParticles.particleTexture = particleTexture;

        disintegrationParticles.emitter = ballPosition;

        disintegrationParticles.minEmitBox = new Vector3(-0.7, -0.7, -0.7);
        disintegrationParticles.maxEmitBox = new Vector3(0.7, 0.7, 0.7);

        const mainColor = playerScored === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;

        disintegrationParticles.color1 = new Color4(
            Math.min(1, mainColor.r * 1.2), 
            Math.min(1, mainColor.g * 1.2), 
            Math.min(1, mainColor.b * 1.2), 
            1.0
        );
        disintegrationParticles.color2 = new Color4(
            Math.min(1, mainColor.r * 1.8),
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

        disintegrationParticles.minSize = 0.15;
        disintegrationParticles.maxSize = 0.5;

        disintegrationParticles.minLifeTime = 0.4;
        disintegrationParticles.maxLifeTime = 1.0;

        disintegrationParticles.direction1 = new Vector3(-6, -6, -6);
        disintegrationParticles.direction2 = new Vector3(6, 6, 6);

        disintegrationParticles.minEmitPower = 4;
        disintegrationParticles.maxEmitPower = 10;

        disintegrationParticles.blendMode = ParticleSystem.BLENDMODE_ADD;

        disintegrationParticles.createSphereEmitter(BALL_CONFIG.DIAMETER / 2);

        disintegrationParticles.minAngularSpeed = -2.5;
        disintegrationParticles.maxAngularSpeed = 2.5;

        disintegrationParticles.emitRate = 0;
        disintegrationParticles.manualEmitCount = 200;

        this.ball.isVisible = false;

        disintegrationParticles.start();

        this.createShockwaveEffect(ballPosition, playerScored);

        setTimeout(() => {
            disintegrationParticles.stop();

            setTimeout(() => {
                disintegrationParticles.dispose();
            }, 1200);
        }, 150);
    }

    private createShockwaveEffect(position: Vector3, playerScored: number): void {
        const shockwaveRing = MeshBuilder.CreateTorus(
            "shockwave", 
            { 
                diameter: BALL_CONFIG.DIAMETER * 0.5, 
                thickness: 0.4,
                tessellation: 32
            }, 
            this.scene
        );

        shockwaveRing.position = position;

        shockwaveRing.rotation = new Vector3(Tools.ToRadians(CAMERA_CONFIG.ROTATION_DEGREES), 0, 0);

        const shockwaveMaterial = new StandardMaterial("shockwaveMaterial", this.scene);

        const baseColor = playerScored === 0 ? MAIN_COLORS.RGB_BLUE : MAIN_COLORS.RGB_PURPLE;
        const brightColor = new Color3(
            Math.min(1, baseColor.r * 1.5),
            Math.min(1, baseColor.g * 1.5),
            Math.min(1, baseColor.b * 1.5)
        );
        
        shockwaveMaterial.emissiveColor = brightColor;
        shockwaveMaterial.alpha = 0.8;
        shockwaveMaterial.disableLighting = true;

        shockwaveRing.material = shockwaveMaterial;

        const startScale = new Vector3(1, 1, 1);
        const endScale = new Vector3(12, 12, 1);

        const animationDuration = 600;
        const startTime = performance.now();

        const easeOutCubic = function(x: number): number {
            return 1 - Math.pow(1 - x, 3);
        };

        const animateShockwave = function() {
            const currentTime = performance.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            
            const easedProgress = easeOutCubic(progress);

            const currentScale = new Vector3(
                startScale.x + (endScale.x - startScale.x) * easedProgress,
                startScale.y + (endScale.y - startScale.y) * easedProgress,
                startScale.z
            );

            shockwaveRing.scaling = currentScale;

            if (shockwaveRing.material && shockwaveRing.material instanceof StandardMaterial) {
                shockwaveRing.material.alpha = 0.8 * (1 - easedProgress);
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateShockwave);
            } else {
                shockwaveRing.dispose();
            }
        };
        
        requestAnimationFrame(animateShockwave);
    }


    public stopGame(): void {
        console.log("Arrêt manuel du jeu");
        
        this.isGameStopped = true;

        this.gameData.gameState = GameState.GAME_OVER;

        if (this.controls.isAIActive()) {
            this.controls.deactivateAI();
        }

        this.controls.setControlsLocked(true);
        
        this.ball.isVisible = false;

        this.engine.stopRenderLoop();

        this.cleanup();

        setTimeout(() => {
            window.history.back();
        }, 100);
    }

    private cleanup(): void {
        try {
            if (this.currentGameMode) {
                this.currentGameMode.cleanup();
                this.currentGameMode = null;
            }
            
            if (this.wallOriginalTexture) {
                this.wallOriginalTexture.dispose();
            }
            if (this.trackingTexture) {
                this.trackingTexture.dispose();
            }
            if (this.finalAnimationTexture) {
                this.finalAnimationTexture.dispose();
            }

            if (this.scorePlayer0Texture) {
                this.scorePlayer0Texture.dispose();
            }
            if (this.scorePlayer1Texture) {
                this.scorePlayer1Texture.dispose();
            }
            if (this.gameOverTexture) {
                this.gameOverTexture.dispose();
            }
            
            console.log("Ressources nettoyées avec succès");
        } catch (error) {
            console.error("Erreur lors du nettoyage des ressources:", error);
        }
    }

    public isManuallystopped(): boolean {
        return this.isGameStopped;
    }

    public get player2GlowLayer(): GlowLayer {
        return this._player2GlowLayer;
    }
}
