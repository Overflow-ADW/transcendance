import { Scene, Mesh, Vector3, MeshBuilder, StandardMaterial, Color3, Animation, CircleEase, EasingFunction, ParticleSystem, Texture, Color4 } from "@babylonjs/core";

export class FourPlayerMode {
    private scene: Scene | null = null;
    private playerMeshes: Mesh[] = [];
    private eliminatedPlayers: Set<number> = new Set();
    private coloredWalls: Map<number, Mesh> = new Map();
    private glowLayers: any = null;

    constructor() {
        // Initialize the four player mode
    }

    private createPlayerWalls(): void {
        // NE PAS créer les murs colorés au début
        // Ils seront créés dynamiquement lors de l'élimination des joueurs
        console.log("Mode 4 joueurs : Murs colorés créés dynamiquement lors des éliminations");
    }

    private eliminatePlayer(playerIndex: number): void {
        console.log(`Élimination du joueur ${playerIndex}`);
        
        if (this.eliminatedPlayers.has(playerIndex)) {
            console.log(`Joueur ${playerIndex} déjà éliminé`);
            return;
        }

        this.eliminatedPlayers.add(playerIndex);
        
        // Obtenir la couleur du joueur éliminé
        const playerColor = this.getPlayerColor(playerIndex);
        
        // NOUVEAU : Créer un mur coloré à la place du joueur éliminé
        this.createColoredWallForEliminatedPlayer(playerIndex, playerColor);
        
        // Masquer le joueur éliminé
        const playerMesh = this.playerMeshes[playerIndex];
        if (playerMesh) {
            playerMesh.isVisible = false;
            
            // Créer un effet de désintégration pour le joueur éliminé
            this.createPlayerEliminationEffect(playerMesh, playerColor);
        }

        // Vérifier s'il reste assez de joueurs pour continuer
        const remainingPlayers = 4 - this.eliminatedPlayers.size;
        console.log(`Joueurs restants : ${remainingPlayers}`);
        
        if (remainingPlayers <= 1) {
            // Fin du jeu - déterminer le gagnant
            this.handleGameEnd();
        }
    }

    private createColoredWallForEliminatedPlayer(playerIndex: number, color: Color3): void {
        console.log(`Création d'un mur coloré pour le joueur éliminé ${playerIndex}`);
        
        if (!this.scene) {
            console.error("Scene not initialized");
            return;
        }
        
        // Déterminer la position et l'orientation du mur selon le joueur
        let wallPosition: Vector3;
        let wallRotation: Vector3;
        let wallDimensions: { width: number, height: number, depth: number };
        
        switch (playerIndex) {
            case 0: // Joueur gauche
                wallPosition = new Vector3(-95, 0, 0);
                wallRotation = new Vector3(0, 0, 0);
                wallDimensions = { width: 2, height: 20, depth: 200 };
                break;
            case 1: // Joueur droite
                wallPosition = new Vector3(95, 0, 0);
                wallRotation = new Vector3(0, 0, 0);
                wallDimensions = { width: 2, height: 20, depth: 200 };
                break;
            case 2: // Joueur haut
                wallPosition = new Vector3(0, 0, 95);
                wallRotation = new Vector3(0, Math.PI / 2, 0);
                wallDimensions = { width: 200, height: 20, depth: 2 };
                break;
            case 3: // Joueur bas
                wallPosition = new Vector3(0, 0, -95);
                wallRotation = new Vector3(0, Math.PI / 2, 0);
                wallDimensions = { width: 200, height: 20, depth: 2 };
                break;
            default:
                console.error(`Index de joueur invalide : ${playerIndex}`);
                return;
        }
        
        // Créer le mur
        const wall = MeshBuilder.CreateBox(`coloredWall_${playerIndex}`, wallDimensions, this.scene);
        wall.position = wallPosition;
        wall.rotation = wallRotation;
        
        // Créer le matériau avec la couleur du joueur éliminé
        const wallMaterial = new StandardMaterial(`coloredWallMaterial_${playerIndex}`, this.scene);
        wallMaterial.emissiveColor = color;
        wallMaterial.diffuseColor = color.scale(0.3);
        wallMaterial.specularColor = color.scale(0.1);
        wallMaterial.ambientColor = color.scale(0.2);
        
        wall.material = wallMaterial;
        
        // Ajouter un effet de glow si disponible
        if (this.glowLayers && this.glowLayers.ballGlowLayer) {
            this.glowLayers.ballGlowLayer.addIncludedOnlyMesh(wall);
        }
        
        // Stocker la référence au mur
        this.coloredWalls.set(playerIndex, wall);
        
        // Animation d'apparition du mur
        this.animateWallAppearance(wall);
    }

    private animateWallAppearance(wall: Mesh): void {
        if (!this.scene) return;
        
        // Animation d'apparition progressive
        wall.scaling = new Vector3(0.1, 0.1, 0.1);
        
        const scaleAnimation = new Animation(
            "wallAppearance",
            "scaling",
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        scaleAnimation.setKeys([
            { frame: 0, value: new Vector3(0.1, 0.1, 0.1) },
            { frame: 15, value: new Vector3(1.2, 1.2, 1.2) },
            { frame: 30, value: new Vector3(1, 1, 1) }
        ]);
        
        const easingFunction = new CircleEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        scaleAnimation.setEasingFunction(easingFunction);
        
        wall.animations = [scaleAnimation];
        this.scene.beginAnimation(wall, 0, 30, false);
    }

    private createPlayerEliminationEffect(playerMesh: Mesh, color: Color3): void {
        if (!this.scene) return;
        
        // Effet de particules pour l'élimination du joueur
        const eliminationParticles = new ParticleSystem("eliminationParticles", 100, this.scene);
        
        // Texture des particules
        const particleTexture = new Texture("https://www.babylonjs-playground.com/textures/flare.png", this.scene);
        eliminationParticles.particleTexture = particleTexture;
        
        // Position de l'émetteur
        eliminationParticles.emitter = playerMesh.position.clone();
        
        // Zone d'émission
        eliminationParticles.minEmitBox = new Vector3(-2, -2, -2);
        eliminationParticles.maxEmitBox = new Vector3(2, 2, 2);
        
        // Couleurs
        eliminationParticles.color1 = new Color4(color.r, color.g, color.b, 1.0);
        eliminationParticles.color2 = new Color4(1, 1, 1, 1.0);
        eliminationParticles.colorDead = new Color4(color.r, color.g, color.b, 0);
        
        // Configuration
        eliminationParticles.minSize = 0.5;
        eliminationParticles.maxSize = 2.0;
        eliminationParticles.minLifeTime = 0.5;
        eliminationParticles.maxLifeTime = 1.5;
        eliminationParticles.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Émission sphérique
        eliminationParticles.createSphereEmitter(3.0);
        eliminationParticles.minEmitPower = 5;
        eliminationParticles.maxEmitPower = 15;
        
        // Émission unique
        eliminationParticles.emitRate = 0;
        eliminationParticles.manualEmitCount = 100;
        
        // Démarrer
        eliminationParticles.start();
        
        // Nettoyage
        setTimeout(() => {
            eliminationParticles.stop();
            setTimeout(() => {
                eliminationParticles.dispose();
            }, 2000);
        }, 100);
    }

    private getPlayerColor(playerIndex: number): Color3 {
        const colors = [
            new Color3(0.137, 0.137, 1),    // Blue - Player 0
            new Color3(0.54, 0, 0.77),      // Purple - Player 1  
            new Color3(0.157, 0.647, 0.271), // Green - Player 2
            new Color3(1, 0.843, 0)         // Yellow - Player 3
        ];
        return colors[playerIndex] || new Color3(1, 1, 1);
    }

    private handleGameEnd(): void {
        console.log("Fin du jeu 4 joueurs");
        // Logic for game end
    }

    // Public methods
    public initialize(scene: Scene, playerMeshes: Mesh[], glowLayers?: any): void {
        this.scene = scene;
        this.playerMeshes = playerMeshes;
        this.glowLayers = glowLayers;
        this.eliminatedPlayers.clear();
        this.coloredWalls.clear();
    }

    public cleanup(): void {
        this.eliminatedPlayers.clear();
        this.coloredWalls.forEach(wall => wall.dispose());
        this.coloredWalls.clear();
        this.scene = null;
        this.playerMeshes = [];
        this.glowLayers = null;
    }
}