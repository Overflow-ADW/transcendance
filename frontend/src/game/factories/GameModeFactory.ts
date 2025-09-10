import { GameType } from "@/game/utils/pongData";
import { DefaultPongMode, IPongGameMode } from "@/game/modes/DefaultPongMode";
import { MultiplayerPongMode } from "@/game/modes/MultiplayerPongMode";

export class GameModeFactory {
    static createGameMode(gameType: GameType): IPongGameMode {
        switch (gameType) {
            case GameType.MULTIPLAYER_PONG:
                return new MultiplayerPongMode();
            case GameType.DEFAULT_PONG:
            default:
                return new DefaultPongMode();
        }
    }
}
