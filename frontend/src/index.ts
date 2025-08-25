// Point d'entrée principal de l'application TypeScript
import { GameManager } from './GameManager';

class App {
    private container: HTMLElement;
    private gameManager: GameManager;

    constructor(containerId: string) {
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Élément avec l'ID ${containerId} non trouvé`);
        }
        this.container = element;
        this.gameManager = new GameManager();
        this.init();
    }

    private init(): void {
        this.render();
        this.setupEventListeners();
        this.checkBackendConnection();
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="app">
                <header>
                    <h1>🎮 Transcendance</h1>
                    <p>Plateforme de jeu en ligne</p>
                </header>
                <main>
                    <div id="status" class="status">
                        Vérification de la connexion...
                    </div>
                    <div class="content">
                        <p>Bienvenue dans Transcendance !</p>
                        <div class="button-group">
                            <button id="test-api" class="btn">Tester l'API</button>
                            <button id="start-game" class="btn btn-primary">🎮 Jouer au Pong</button>
                            <button id="stop-game" class="btn btn-secondary" style="display: none;">⏹️ Arrêter le jeu</button>
                        </div>
                    </div>
                </main>
            </div>
        `;
    }

    private setupEventListeners(): void {
        const testButton = document.getElementById('test-api');
        const startGameButton = document.getElementById('start-game');
        const stopGameButton = document.getElementById('stop-game');
        
        if (testButton) {
            testButton.addEventListener('click', () => this.testAPI());
        }

        if (startGameButton) {
            startGameButton.addEventListener('click', () => this.startGame());
        }

        if (stopGameButton) {
            stopGameButton.addEventListener('click', () => this.stopGame());
        }
    }

    private async checkBackendConnection(): Promise<void> {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            this.updateStatus('✅ Backend connecté', 'success');
            console.log('Backend status:', data);
        } catch (error) {
            this.updateStatus('❌ Backend non disponible', 'error');
            console.error('Erreur de connexion au backend:', error);
        }
    }

    private async testAPI(): Promise<void> {
        try {
            const response = await fetch('/api/');
            const data = await response.json();
            alert(`Réponse de l'API: ${data.message}`);
        } catch (error) {
            alert('Erreur lors du test de l\'API');
            console.error('Erreur API:', error);
        }
    }

    private startGame(): void {
        try {
            this.gameManager.startPongGame();
            
            // Changer l'affichage des boutons
            const startButton = document.getElementById('start-game');
            const stopButton = document.getElementById('stop-game');
            
            if (startButton) startButton.style.display = 'none';
            if (stopButton) stopButton.style.display = 'inline-block';
            
            this.updateStatus('🎮 Jeu en cours...', 'success');
        } catch (error) {
            console.error('Erreur lors du démarrage du jeu:', error);
            this.updateStatus('❌ Erreur lors du démarrage du jeu', 'error');
        }
    }

    private stopGame(): void {
        try {
            this.gameManager.stopGame();
            
            // Changer l'affichage des boutons
            const startButton = document.getElementById('start-game');
            const stopButton = document.getElementById('stop-game');
            
            if (startButton) startButton.style.display = 'inline-block';
            if (stopButton) stopButton.style.display = 'none';
            
            this.updateStatus('⏹️ Jeu arrêté', 'success');
        } catch (error) {
            console.error('Erreur lors de l\'arrêt du jeu:', error);
        }
    }

    private updateStatus(message: string, type: string): void {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
        }
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new App('app');
});
