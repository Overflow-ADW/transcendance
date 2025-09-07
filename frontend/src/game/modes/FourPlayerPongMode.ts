import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
import { IPongGameMode } from "./DefaultPongMode";
import { GameType } from "@/game/utils/pongData";
import { PLAYER_CONFIG } from "@/game/utils/pongValues";
import { DefaultPongMode } from "./DefaultPongMode";

/**
 * FourPlayerPongMode
 *
 * Comportement identique à DefaultPongMode (même logique / balle / collisions)
 * mais crée 2 paddles supplémentaires placés plus près du centre (visuels).
 *
 * NOTE: Le moteur de jeu principal (balle / collisions) reste géré par DefaultPongMode
 * afin de garantir le même comportement exact que le mode par défaut. Si vous souhaitez
 * que la balle interagisse avec les deux paddles additionnels, il faudra étendre la
 * logique de collision / PongBall en conséquence.
 */
export class FourPlayerPongMode implements IPongGameMode {
    private delegateMode: DefaultPongMode | null = null;
    private extraPlayers: Mesh[] = [];
    private sceneRef: Scene | null = null;

    initialize(
        scene: Scene,
        ball: Mesh,
        player0: Mesh,
        player1: Mesh,
        topWall: Mesh,
        bottomWall: Mesh,
        gameData: any,
        controls: any,
        parent: any,
        glowLayers?: any
    ): void {
        this.sceneRef = scene;

        // Déléguons toute la logique au mode par défaut pour garantir comportement identique
        this.delegateMode = new DefaultPongMode();
        this.delegateMode.initialize(
            scene,
            ball,
            player0,
            player1,
            topWall,
            bottomWall,
            gameData,
            controls,
            parent,
            glowLayers
        );

        // Créer 2 joueurs visuels supplémentaires, plus proches du centre
        // Utilise PLAYER_CONFIG pour dimensions et hauteur Y
        const w = PLAYER_CONFIG.WIDTH ?? 10;
        const h = PLAYER_CONFIG.HEIGHT ?? 10;
        const d = PLAYER_CONFIG.DEPTH ?? 90;
        const y = PLAYER_CONFIG.POSITION_Y ?? 10;

        // Positions proches du centre (entre le centre et les paddles latéraux)
        const nearLeftX = -100;  // ajuste si vous voulez plus/moins proche
        const nearRightX = 100;

        const createExtraPlayer = (name: string, xPos: number): Mesh => {
            const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
            mesh.position.y = y;
            mesh.position.x = xPos;
            mesh.position.z = PLAYER_CONFIG.INITIAL_POSITION_Z ?? 0;

            const mat = new StandardMaterial(`${name}_mat`, scene);
            // couleur grisée semi-transparente pour différencier
            mat.diffuseColor = new Color3(0.6, 0.6, 0.6);
            mat.emissiveColor = mat.diffuseColor.scale(0.2);
            mesh.material = mat;

            // disable collisions/physics by default so it doesn't interfere with DefaultPong logic
            mesh.isPickable = false;

            return mesh;
        };

        const extraA = createExtraPlayer("four_extra_left", nearLeftX);
        const extraB = createExtraPlayer("four_extra_right", nearRightX);

        this.extraPlayers.push(extraA, extraB);
    }

    cleanup(): void {
        // cleanup delegate mode first
        try {
            if (this.delegateMode) {
                this.delegateMode.cleanup();
            }
        } finally {
            // remove & dispose extra players
            if (this.extraPlayers && this.sceneRef) {
                this.extraPlayers.forEach(mesh => {
                    try {
                        mesh.dispose();
                    } catch { /* ignore */ }
                });
            }
            this.extraPlayers = [];
            this.delegateMode = null;
            this.sceneRef = null;
        }
    }

    getType(): GameType {
        return GameType.FOUR_PLAYER_PONG;
    }
}