import { GameType } from "@/game/utils/pongData";
import { DefaultPongMode, IPongGameMode } from "@/game/modes/DefaultPongMode";
import { FourPlayerPongMode } from "@/game/modes/FourPlayerPongMode";

/**
 * Factory pour créer le mode de jeu approprié en fonction du type
 */
export class GameModeFactory {
    /**
     * Crée et retourne une instance du mode de jeu correspondant au type spécifié
     * @param gameType Type de jeu à créer
     * @returns Instance du mode de jeu
     */
    static createGameMode(gameType: GameType): IPongGameMode {
        switch (gameType) {
            case GameType.FOUR_PLAYER_PONG:
                return new FourPlayerPongMode();
            case GameType.DEFAULT_PONG:
            default:
                return new DefaultPongMode();
        }
    }
}
