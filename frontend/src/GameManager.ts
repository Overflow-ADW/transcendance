          // Intégration du jeu Pong de votre collègue dans l'application TypeScript
import { Pong as PongGame } from './game/pong/game/Pong';

export class GameManager {
    private currentGame: PongGame | null = null;
    private gameContainer: HTMLElement | null = null;
    private canvas: HTMLCanvasElement | null = null;

    constructor() {
        this.initializeGameContainer();
    }

    private initializeGameContainer(): void {
        // Créer le conteneur de jeu
        this.gameContainer = document.createElement('div');
        this.gameContainer.id = 'game-container';
        this.gameContainer.className = 'game-container';
        this.gameContainer.style.display = 'none'; // Caché par défaut
        
        // Créer le canvas pour BabylonJS
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas';
        this.canvas.className = 'game-canvas';
        
        this.gameContainer.appendChild(this.canvas);
        document.body.appendChild(this.gameContainer);
    }

    public startPongGame(): void {
        if (!this.canvas) {
            console.error('Canvas non initialisé');
            return;
        }

        try {
            // Afficher le conteneur de jeu
            if (this.gameContainer) {
                this.gameContainer.style.display = 'block';
            }

            // Créer une nouvelle instance du jeu Pong
            this.currentGame = new PongGame(this.canvas);
            
            console.log('Jeu Pong démarré avec succès');
        } catch (error) {
            console.error('Erreur lors du démarrage du jeu:', error);
        }
    }

    public stopGame(): void {
        if (this.currentGame) {
            // Si le jeu a une méthode dispose/cleanup
            if (typeof (this.currentGame as any).dispose === 'function') {
                (this.currentGame as any).dispose();
            }
            this.currentGame = null;
        }

        // Cacher le conteneur de jeu
        if (this.gameContainer) {
            this.gameContainer.style.display = 'none';
        }

        console.log('Jeu arrêté');
    }

    public toggleGame(): void {
        if (this.currentGame) {
            this.stopGame();
        } else {
            this.startPongGame();
        }
    }

    public isGameRunning(): boolean {
        return this.currentGame !== null;
    }
}
