import { Scene, Mesh, Vector3 } from "@babylonjs/core";
import { FourPlayerData, FourPlayerGameState } from "./FourPlayerData";
import { FOUR_PLAYER_CONFIG } from "./pongValues";

/**
 * Interface pour la configuration physique de la balle 4 joueurs
 */
export interface FourPlayerBallPhysics {
    initialSpeed: number;
    speedIncrement: number;
    maxSpeed: number;
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
    private lastHitPlayer: number = -1; // Pour éviter les collisions multiples
    private lastHitTime: number = 0; // Timestamp de la dernière collision

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
        this.startNewRound();
    }

    /**
     * Configure le mouvement de la balle
     */
    private setupBallMovement(): void {
        this.scene.registerBeforeRender(() => {
            if (this.isActive && this.gameData.gameState === FourPlayerGameState.PLAYING) {
                this.updateBallPosition();
                this.checkCollisions();
            }
        });
    }

    /**
     * Démarre un nouveau round avec une direction aléatoire naturelle
     */
    private startNewRound(): void {
        // Repositionner la balle au centre
        this.ball.position = new Vector3(0, 0, 0);
        this.ball.isVisible = true;

        // Réinitialiser les protections contre les collisions multiples
        this.lastHitPlayer = -1;
        this.lastHitTime = 0;

        // Direction aléatoire à 360° (naturelle)
        this.calculateRandomDirection();
        
        this.currentSpeed = this.physics.initialSpeed;
        this.isActive = true;

        console.log(`Nouvelle balle avec direction aléatoire`);
    }

    /**
     * Calcule une direction aléatoire naturelle à 360°
     */
    private calculateRandomDirection(): void {
        // Angle aléatoire entre 0 et 2π (360 degrés)
        const angle = Math.random() * Math.PI * 2;
        
        // Convertir l'angle en direction normalisée
        const direction = new Vector3(
            Math.cos(angle),
            0,
            Math.sin(angle)
        );

        this.velocity = direction.normalize();
    }

    /**
     * Met à jour la position de la balle
     */
    private updateBallPosition(): void {
        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
        const movement = this.velocity.scale(this.currentSpeed * deltaTime * 60);
        this.ball.position.addInPlace(movement);
    }

    /**
     * Vérifie les collisions avec les joueurs et les zones de goal
     */
    private checkCollisions(): void {
        // Vérifier les collisions avec les joueurs actifs
        this.players.forEach((player, index) => {
            if (this.gameData.isPlayerActive(index) && player.isVisible) {
                if (this.checkPlayerCollision(player, index)) {
                    this.handlePlayerHit(player, index);
                }
            }
        });

        // Vérifier les collisions avec les murs colorés
        this.checkWallCollisions();

        // Vérifier si la balle est sortie du terrain (goal)
        this.checkGoalZones();
    }

    /**
     * Vérifie les collisions avec les murs colorés
     */
    private checkWallCollisions(): void {
        const ballPos = this.ball.position;
        const ballRadius = FOUR_PLAYER_CONFIG.BALL.DIAMETER / 2; // Calculer le rayon à partir du diamètre
        
        this.walls.forEach((wall) => {
            if (!wall.isVisible) return; // Ignorer les murs invisibles
            
            const wallPos = wall.position;
            const wallBounds = wall.getBoundingInfo().boundingBox;
            
            // Vérifier collision avec le mur
            const withinX = Math.abs(ballPos.x - wallPos.x) < (wallBounds.maximumWorld.x - wallBounds.minimumWorld.x) / 2 + ballRadius;
            const withinZ = Math.abs(ballPos.z - wallPos.z) < (wallBounds.maximumWorld.z - wallBounds.minimumWorld.z) / 2 + ballRadius;
            
            if (withinX && withinZ) {
                this.handleWallCollision(wall);
            }
        });
    }

    /**
     * Gère la collision avec un mur coloré
     */
    private handleWallCollision(wall: Mesh): void {
        const wallPos = wall.position;
        const ballPos = this.ball.position;
        
        // Déterminer la direction de rebond selon la position du mur
        if (Math.abs(wallPos.x) > Math.abs(wallPos.z)) {
            // Mur vertical (gauche ou droite) - inverser X
            this.velocity.x = -this.velocity.x;
        } else {
            // Mur horizontal (haut ou bas) - inverser Z
            this.velocity.z = -this.velocity.z;
        }
        
        // Pousser la balle pour éviter qu'elle reste collée au mur
        const pushDistance = 40; // Ajusté pour la nouvelle taille
        this.ball.position.addInPlace(this.velocity.scale(pushDistance));
        
        console.log(`Collision avec mur ${wall.name} - nouvelle direction: ${this.velocity.toString()}`);
    }

    /**
     * Vérifie si la balle est dans une zone de goal
     */
    private checkGoalZones(): void {
        const ballPos = this.ball.position;
        const { LEFT, RIGHT, TOP, BOTTOM } = FOUR_PLAYER_CONFIG.GOAL_ZONES;

        // Goal côté gauche (Player 0)
        if (ballPos.x < LEFT && this.gameData.isPlayerActive(0)) {
            this.handleGoal(0);
            return;
        }

        // Goal côté droit (Player 1)
        if (ballPos.x > RIGHT && this.gameData.isPlayerActive(1)) {
            this.handleGoal(1);
            return;
        }

        // Goal côté haut (Player 2)
        if (ballPos.z > TOP && this.gameData.isPlayerActive(2)) {
            this.handleGoal(2);
            return;
        }

        // Goal côté bas (Player 3)
        if (ballPos.z < BOTTOM && this.gameData.isPlayerActive(3)) {
            this.handleGoal(3);
            return;
        }
    }

    /**
     * Gère un goal (élimination d'un joueur)
     */
    private handleGoal(playerId: number): void {
        console.log(`Goal ! Joueur ${playerId} éliminé`);
        
        // Éliminer le joueur
        this.gameData.eliminatePlayer(playerId);
        
        // Effet de désintégration de la balle
        if (this.parentGame && this.parentGame.createBallDisintegrationEffect) {
            this.parentGame.createBallDisintegrationEffect(playerId);
        }

        // Arrêter la balle temporairement
        this.isActive = false;
        
        // Démarrer un nouveau round après un délai
        setTimeout(() => {
            if (this.gameData.activePlayersCount > 1) {
                this.startNewRound();
            }
        }, 2000);
    }

    /**
     * Vérifie la collision avec un joueur
     */
    private checkPlayerCollision(player: Mesh, playerIndex: number): boolean {
        if (!player.isVisible) return false; // Ne pas détecter de collision si le joueur est invisible
        
        const ballPos = this.ball.position;
        const playerPos = player.position;
        
        // Utiliser les nouvelles dimensions augmentées pour le mode 4 joueurs
        const isHorizontal = playerIndex >= 2;
        const playerWidth = isHorizontal ? FOUR_PLAYER_CONFIG.PLAYER_WIDTH : FOUR_PLAYER_CONFIG.PLAYER_DEPTH;
        const playerDepth = isHorizontal ? FOUR_PLAYER_CONFIG.PLAYER_DEPTH : FOUR_PLAYER_CONFIG.PLAYER_WIDTH;
        
        // Seuil de collision ajusté pour la nouvelle taille de balle
        const threshold = FOUR_PLAYER_CONFIG.BALL.COLLISION_THRESHOLD;

        const withinX = Math.abs(ballPos.x - playerPos.x) < (playerWidth / 2 + threshold);
        const withinZ = Math.abs(ballPos.z - playerPos.z) < (playerDepth / 2 + threshold);
        
        return withinX && withinZ;
    }

    /**
     * Gère la collision avec un joueur
     */
    private handlePlayerHit(player: Mesh, playerIndex: number): void {
        if (!player.isVisible) return;
        
        // Éviter les collisions multiples avec le même joueur
        const currentTime = performance.now();
        if (this.lastHitPlayer === playerIndex && (currentTime - this.lastHitTime) < 500) {
            return; // Ignorer si collision trop récente avec le même joueur (réduit de 750ms à 500ms)
        }
        
        this.lastHitPlayer = playerIndex;
        this.lastHitTime = currentTime;
        
        // Calculer une direction simple et prévisible
        let newDirection: Vector3;
        
        if (playerIndex === 0) { // Gauche - renvoie vers la droite
            newDirection = new Vector3(1, 0, 0);
        } else if (playerIndex === 1) { // Droite - renvoie vers la gauche  
            newDirection = new Vector3(-1, 0, 0);
        } else if (playerIndex === 2) { // Haut - renvoie vers le bas
            newDirection = new Vector3(0, 0, -1);
        } else { // Bas - renvoie vers le haut
            newDirection = new Vector3(0, 0, 1);
        }

        // Ajouter une petite variation aléatoire pour éviter les trajectoires répétitives
        const randomVariation = 0.15; // Réduit pour plus de prévisibilité
        newDirection.x += (Math.random() - 0.5) * randomVariation;
        newDirection.z += (Math.random() - 0.5) * randomVariation;

        // Normaliser la direction
        this.velocity = newDirection.normalize();
        
        // Augmenter légèrement la vitesse
        this.currentSpeed = Math.min(
            this.currentSpeed + this.physics.speedIncrement,
            this.physics.maxSpeed
        );

        // Pousser la balle IMMÉDIATEMENT avec une distance adaptée à la nouvelle taille
        const pushDistance = 80; // Distance augmentée pour la plus grosse balle
        this.ball.position.addInPlace(this.velocity.scale(pushDistance));

        console.log(`Joueur ${playerIndex} hit - direction: ${this.velocity.toString()}, vitesse: ${this.currentSpeed}`);
    }

    /**
     * Réinitialise la balle
     */
    public reset(): void {
        this.ball.position = new Vector3(0, 0, 0);
        this.ball.isVisible = true;
        this.velocity = new Vector3(0, 0, 0);
        this.currentSpeed = 0;
        this.isActive = false;
        // SUPPRIMÉ : Plus d'obstacles à nettoyer
        
        // Démarrer un nouveau round après un court délai
        setTimeout(() => {
            this.startNewRound();
        }, 1000);
    }
}