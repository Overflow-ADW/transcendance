import { Scene, Mesh, Vector3, Color3, ParticleSystem, Texture, Color4, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import { FourPlayerData, FourPlayerGameState } from "./FourPlayerData";
import { FOUR_PLAYER_CONFIG, MAIN_COLORS } from "./pongValues";

/**
 * Interface pour la configuration physique de la balle 4 joueurs
 */
export interface FourPlayerBallPhysics {
    checkCollisionWithPlayer: (ballPosition: Vector3, playerMesh: Mesh) => boolean;
    checkCollisionWithWall: (ballPosition: Vector3, wallMesh: Mesh) => boolean;
    handlePlayerCollision: (playerIndex: number, ballPosition: Vector3, playerPosition: Vector3) => void;
    handleWallCollision: (wallNormal: Vector3) => void;
    updateBallPosition: (deltaTime: number) => void;
    resetBall: () => void;
}

/**
 * Gestionnaire de la balle pour le mode 4 joueurs
 */
export class FourPlayerBall {
    private scene: Scene;
    private ball: Mesh;
    private players: Mesh[];
    private walls: Mesh[];
    private gameData: FourPlayerData;
    private physics: FourPlayerBallPhysics;
    private parentGame: any;

    private velocity: Vector3 = new Vector3(0, 0, 0);
    private currentSpeed: number = 0;
    private isActive: boolean = false;
    private lastHitPlayer: number = -1;
    private lastHitTime: number = 0;

    constructor(
        scene: Scene,
        ball: Mesh,
        players: Mesh[],
        walls: Mesh[],
        gameData: FourPlayerData,
        physics: FourPlayerBallPhysics,
        parentGame: any
    ) {
        this.scene = scene;
        this.ball = ball;
        this.players = players;
        this.walls = walls;
        this.gameData = gameData;
        this.physics = physics;
        this.parentGame = parentGame;

        this.setupBallMovement();
    }

    private setupBallMovement(): void {
        // Configuration initiale de la balle
        this.currentSpeed = FOUR_PLAYER_CONFIG.BALL.PHYSICS.INITIAL_SPEED;
        this.calculateRandomDirection();
        
        // Démarrer le mouvement
        this.isActive = true;
        this.startNewRound();
    }

    private startNewRound(): void {
        // Position au centre
        this.ball.position = new Vector3(0, 0, 0);
        
        // Direction aléatoire
        this.calculateRandomDirection();
        
        // Réinitialiser les variables
        this.lastHitPlayer = -1;
        this.lastHitTime = 0;
        this.isActive = true;
    }

    private calculateRandomDirection(): void {
        // Angle aléatoire entre 0 et 2π
        const angle = Math.random() * Math.PI * 2;
        
        // Direction normalisée
        const direction = new Vector3(
            Math.cos(angle),
            0,
            Math.sin(angle)
        ).normalize();
        
        // Appliquer la vitesse
        this.velocity = direction.scale(this.currentSpeed);
    }

    public update(deltaTime: number): void {
        if (!this.isActive) return;

        // Sauvegarder l'ancienne position
        const oldPosition = this.ball.position.clone();
        
        // Calculer la nouvelle position
        const newPosition = this.ball.position.add(this.velocity.scale(deltaTime));
        
        // Vérifier les collisions avec les joueurs actifs
        for (let i = 0; i < this.players.length; i++) {
            if (this.gameData.isPlayerActive(i) && this.players[i]) {
                if (this.checkCollisionWithPlayer(newPosition, this.players[i])) {
                    this.handlePlayerCollision(i, newPosition, this.players[i].position);
                    return;
                }
            }
        }

        // Vérifier les collisions avec les murs colorés (joueurs éliminés)
        for (let i = 0; i < this.walls.length; i++) {
            if (this.walls[i] && this.checkCollisionWithWall(newPosition, this.walls[i])) {
                this.handleWallCollision(i, newPosition);
                return;
            }
        }

        // Vérifier si la balle sort des limites du terrain
        if (this.isBallOutOfBounds(newPosition)) {
            this.handleBallOutOfBounds();
            return;
        }

        // Mettre à jour la position de la balle
        this.ball.position = newPosition;
    }

    private checkCollisionWithPlayer(ballPosition: Vector3, playerMesh: Mesh): boolean {
        if (!playerMesh) return false;
        
        const distance = Vector3.Distance(ballPosition, playerMesh.position);
        const ballRadius = FOUR_PLAYER_CONFIG.BALL.DIAMETER / 2;
        const playerRadius = Math.max(FOUR_PLAYER_CONFIG.PLAYER_WIDTH, FOUR_PLAYER_CONFIG.PLAYER_DEPTH) / 2;
        const collisionDistance = ballRadius + playerRadius;
        
        return distance <= collisionDistance;
    }

    private checkCollisionWithWall(ballPosition: Vector3, wallMesh: Mesh): boolean {
        if (!wallMesh) return false;
        
        // Vérification simple de collision avec les murs (boîtes englobantes)
        const ballRadius = FOUR_PLAYER_CONFIG.BALL.DIAMETER / 2;
        const wallBounds = wallMesh.getBoundingInfo().boundingBox;
        
        return (ballPosition.x + ballRadius >= wallBounds.minimumWorld.x &&
                ballPosition.x - ballRadius <= wallBounds.maximumWorld.x &&
                ballPosition.z + ballRadius >= wallBounds.minimumWorld.z &&
                ballPosition.z - ballRadius <= wallBounds.maximumWorld.z);
    }

    private handlePlayerCollision(playerIndex: number, ballPosition: Vector3, playerPosition: Vector3): void {
        // Éviter les collisions multiples rapprochées
        const currentTime = Date.now();
        if (this.lastHitPlayer === playerIndex && currentTime - this.lastHitTime < 100) {
            return;
        }

        this.lastHitPlayer = playerIndex;
        this.lastHitTime = currentTime;

        // Calculer la direction de rebond
        const direction = ballPosition.subtract(playerPosition).normalize();
        
        // Augmenter la vitesse
        this.currentSpeed = Math.min(
            this.currentSpeed * FOUR_PLAYER_CONFIG.BALL.PHYSICS.SPEED_INCREMENT,
            FOUR_PLAYER_CONFIG.BALL.PHYSICS.MAX_SPEED
        );

        // Appliquer la nouvelle vélocité
        this.velocity = direction.scale(this.currentSpeed);
        
        // Effet visuel de collision
        this.createCollisionEffect(ballPosition, new Color3(1, 1, 1)); // White color for collision
    }

    private handleWallCollision(wallIndex: number, ballPosition: Vector3): void {
        // Déterminer la normale du mur selon sa position
        let normal: Vector3;
        
        switch (wallIndex) {
            case 0: // Mur gauche
                normal = new Vector3(1, 0, 0);
                break;
            case 1: // Mur droit
                normal = new Vector3(-1, 0, 0);
                break;
            case 2: // Mur haut
                normal = new Vector3(0, 0, -1);
                break;
            case 3: // Mur bas
                normal = new Vector3(0, 0, 1);
                break;
            default:
                normal = new Vector3(1, 0, 0);
        }

        // Calculer la réflexion
        const dotProduct = Vector3.Dot(this.velocity, normal);
        this.velocity = this.velocity.subtract(normal.scale(2 * dotProduct));
        
        // Effet visuel
        this.createCollisionEffect(ballPosition, new Color3(1, 0, 0)); // Red color for wall collision
    }

    private isBallOutOfBounds(position: Vector3): boolean {
        const fieldWidth = 1000; // Use default field dimensions
        const fieldHeight = 600;
        return (position.x < -fieldWidth/2 || position.x > fieldWidth/2 ||
                position.z < -fieldHeight/2 || position.z > fieldHeight/2);
    }

    private handleBallOutOfBounds(): void {
        // Déterminer quel joueur a perdu le point
        const ballPos = this.ball.position;
        let eliminatedPlayer = -1;
        const fieldWidth = 1000;
        const fieldHeight = 600;

        if (ballPos.x < -fieldWidth/2) {
            eliminatedPlayer = 0; // Joueur gauche
        } else if (ballPos.x > fieldWidth/2) {
            eliminatedPlayer = 1; // Joueur droit
        } else if (ballPos.z > fieldHeight/2) {
            eliminatedPlayer = 2; // Joueur haut
        } else if (ballPos.z < -fieldHeight/2) {
            eliminatedPlayer = 3; // Joueur bas
        }

        if (eliminatedPlayer >= 0 && this.gameData.isPlayerActive(eliminatedPlayer)) {
            this.eliminatePlayer(eliminatedPlayer);
        }

        // Redémarrer la manche
        this.startNewRound();
    }

    private eliminatePlayer(playerIndex: number): void {
        // Marquer le joueur comme éliminé
        this.gameData.eliminatePlayer(playerIndex);
        
        // Créer un mur coloré à la place du joueur éliminé
        if (this.parentGame && this.parentGame.createEliminationWall) {
            this.parentGame.createEliminationWall(playerIndex);
        }
        
        // Effet d'élimination
        if (this.players[playerIndex]) {
            this.createEliminationEffect(this.players[playerIndex], this.getPlayerColor(playerIndex));
            this.players[playerIndex].setEnabled(false);
        }

        // Vérifier les conditions de fin de partie
        const activePlayers = this.gameData.getActivePlayers();
        if (activePlayers.length <= 1) {
            this.endGame(activePlayers[0] || -1);
        }
    }

    private createCollisionEffect(position: Vector3, color: Color3): void {
        // Effet de particules pour les collisions
        const particles = new ParticleSystem("collision", 20, this.scene);
        
        // Configuration des particules
        particles.emitter = position;
        particles.minEmitBox = new Vector3(-0.5, -0.5, -0.5);
        particles.maxEmitBox = new Vector3(0.5, 0.5, 0.5);
        
        particles.color1 = new Color4(color.r, color.g, color.b, 1.0);
        particles.color2 = new Color4(1, 1, 1, 1.0);
        particles.colorDead = new Color4(0, 0, 0, 0);
        
        particles.minSize = 0.1;
        particles.maxSize = 0.3;
        particles.minLifeTime = 0.3;
        particles.maxLifeTime = 0.6;
        particles.emitRate = 50;
        
        particles.start();
        
        // Arrêter après un court délai
        setTimeout(() => {
            particles.stop();
            setTimeout(() => particles.dispose(), 1000);
        }, 200);
    }

    private createEliminationEffect(playerMesh: Mesh, color: Color3): void {
        // Effet d'élimination plus spectaculaire
        const particles = new ParticleSystem("elimination", 100, this.scene);
        
        particles.emitter = playerMesh.position;
        particles.minEmitBox = new Vector3(-2, -2, -2);
        particles.maxEmitBox = new Vector3(2, 2, 2);
        
        particles.color1 = new Color4(color.r, color.g, color.b, 1.0);
        particles.color2 = new Color4(1, 0, 0, 1.0);
        particles.colorDead = new Color4(0, 0, 0, 0);
        
        particles.minSize = 0.5;
        particles.maxSize = 2.0;
        particles.minLifeTime = 1.0;
        particles.maxLifeTime = 2.0;
        particles.emitRate = 100;
        
        particles.start();
        
        setTimeout(() => {
            particles.stop();
            setTimeout(() => particles.dispose(), 3000);
        }, 1000);
    }

    private getPlayerColor(playerIndex: number): Color3 {
        const colors = [
            MAIN_COLORS.RGB_BLUE,    // Joueur 0
            MAIN_COLORS.RGB_PURPLE,  // Joueur 1
            MAIN_COLORS.RGB_GREEN,   // Joueur 2
            MAIN_COLORS.RGB_YELLOW   // Joueur 3
        ];
        return colors[playerIndex] || new Color3(1, 1, 1); // Default to white
    }

    private endGame(winnerIndex: number): void {
        this.isActive = false;
        
        if (this.parentGame && this.parentGame.endGame) {
            this.parentGame.endGame(winnerIndex);
        }
    }

    public reset(): void {
        this.currentSpeed = FOUR_PLAYER_CONFIG.BALL.PHYSICS.INITIAL_SPEED;
        this.lastHitPlayer = -1;
        this.lastHitTime = 0;
        this.startNewRound();
    }

    public setActive(active: boolean): void {
        this.isActive = active;
    }

    public getVelocity(): Vector3 {
        return this.velocity.clone();
    }

    public setVelocity(velocity: Vector3): void {
        this.velocity = velocity.clone();
    }
}