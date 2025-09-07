import { CONTROLS_CONFIG } from "@/game/utils/pongValues";

/**
 * CORRECTION MAJEURE : KeyboardSimulator avec debugging complet
 */
export class KeyboardSimulator {
    private activeKeys: Set<string> = new Set();

    constructor(private keyEventTarget: EventTarget = window) {}

    public pressKey(key: string): void {
        const keyCode = this.getKeyCode(key);
        if (!keyCode) {
            console.error(`❌ ERREUR KeySimulator: Code de touche non trouvé pour "${key}"`);
            return;
        }

        this.activeKeys.add(key);

        const event = new KeyboardEvent('keydown', {
            key: keyCode,
            code: keyCode,
            bubbles: true,
            cancelable: true
        });

        console.log(`⌨️ IA: Simulation PRESSÉE "${key}" -> "${keyCode}"`);
        this.keyEventTarget.dispatchEvent(event);
    }

    public releaseKey(key: string): void {
        const keyCode = this.getKeyCode(key);
        if (!keyCode) {
            console.error(`❌ ERREUR KeySimulator: Code de touche non trouvé pour "${key}"`);
            return;
        }

        this.activeKeys.delete(key);

        const event = new KeyboardEvent('keyup', {
            key: keyCode,
            code: keyCode,
            bubbles: true,
            cancelable: true
        });

        console.log(`⌨️ IA: Simulation RELÂCHÉE "${key}" -> "${keyCode}"`);
        this.keyEventTarget.dispatchEvent(event);
    }

    public releaseAll(): void {
        console.log(`⌨️ IA: Libération de toutes les touches: [${Array.from(this.activeKeys).join(', ')}]`);
        const keysToRelease = Array.from(this.activeKeys);
        keysToRelease.forEach(key => this.releaseKey(key));
    }

    private getKeyCode(command: string): string | null {
        if (command === 'UP') {
            const upKeys = CONTROLS_CONFIG.KEYS.PLAYER1.UP;
            if (upKeys && upKeys.length > 0) {
                console.log(`🎮 Mapping UP -> "${upKeys[0]}"`);
                return upKeys[0];
            }
        } else if (command === 'DOWN') {
            const downKeys = CONTROLS_CONFIG.KEYS.PLAYER1.DOWN;
            if (downKeys && downKeys.length > 0) {
                console.log(`🎮 Mapping DOWN -> "${downKeys[0]}"`);
                return downKeys[0];
            }
        }
        
        console.error(`❌ Aucun mapping trouvé pour la commande "${command}"`);
        return null;
    }

    public isKeyPressed(key: string): boolean {
        return this.activeKeys.has(key);
    }

    /**
     * NOUVELLE MÉTHODE : Debug des touches actives
     */
    public getActiveKeys(): string[] {
        return Array.from(this.activeKeys);
    }
}
