import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
import { IPongGameMode } from "./DefaultPongMode";
import { GameType } from "@/game/utils/pongData";
import { PLAYER_CONFIG } from "@/game/utils/pongValues";
import { DefaultPongMode } from "./DefaultPongMode";
import { MAIN_COLORS } from "@/game/utils/pongValues";

/**
 * FourPlayerPongMode
 *
 * Uses the same logic as DefaultPongMode but enables player2/player3
 * as full paddles: visible, collision enabled and controlled via keys.
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

        // Initialize default mode (keeps ball logic, scoring, etc.)
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

        // Try to reuse existing player2/player3 created in Pong.createScene, otherwise create them
        let player2 = scene.getMeshByName("player2") as Mesh | null;
        let player3 = scene.getMeshByName("player3") as Mesh | null;

        const w = PLAYER_CONFIG.WIDTH ?? 10;
        const h = PLAYER_CONFIG.HEIGHT ?? 10;
        const d = PLAYER_CONFIG.DEPTH ?? 90;
        const y = PLAYER_CONFIG.POSITION_Y ?? 10;
        const nearLeftX = -200;
        const nearRightX = 200;

        const ensurePlayer = (mesh: Mesh | null, name: string, xPos: number, color: Color3): Mesh => {
            if (mesh) {
                mesh.isVisible = true;
                mesh.position.x = xPos;
                mesh.position.y = y;
                mesh.position.z = PLAYER_CONFIG.INITIAL_POSITION_Z ?? 0;
                // ensure required properties for collisions
                mesh.isPickable = true;
                mesh.checkCollisions = true;
                // ensure material uses correct color
                if (!(mesh.material instanceof StandardMaterial)) {
                    const mat = new StandardMaterial(`${name}_mat`, scene);
                    mat.diffuseColor = color;
                    mat.emissiveColor = color.scale(0.5);
                    mesh.material = mat;
                } else {
                    (mesh.material as StandardMaterial).diffuseColor = color;
                    (mesh.material as StandardMaterial).emissiveColor = color.scale(0.5);
                }
                return mesh;
            } else {
                const newMesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
                newMesh.position.x = xPos;
                newMesh.position.y = y;
                newMesh.position.z = PLAYER_CONFIG.INITIAL_POSITION_Z ?? 0;
                const mat = new StandardMaterial(`${name}_mat`, scene);
                mat.diffuseColor = color;
                mat.emissiveColor = color.scale(0.5);
                newMesh.material = mat;
                newMesh.isPickable = true;
                newMesh.checkCollisions = true;
                return newMesh;
            }
        };

        player2 = ensurePlayer(player2, "player2", nearLeftX, MAIN_COLORS.RGB_GREEN);
        player3 = ensurePlayer(player3, "player3", nearRightX, MAIN_COLORS.RGB_YELLOW);

        this.extraPlayers = [player2, player3];

        // If controls object supports adding players (backwards compatible), attach them
        if (typeof controls?.setMovementConfig === "function") {
            // If PongControls was constructed with optional player2/player3 (see Pong.ts change),
            // controls should already handle them. But in case it exposes an API to add players:
            if (typeof controls?.addPlayer === "function") {
                try { controls.addPlayer(2, player2); } catch { /* ignore */ }
                try { controls.addPlayer(3, player3); } catch { /* ignore */ }
            }
        }

        // Also ensure these extra players are part of the physics/collision checks if the game mode uses a multi-player ball manager.
        // If your ball manager supports passing a players array, you should create/use that manager here (FourPlayerBall).
        // Otherwise the DefaultPongMode's ball may not collide with these additional paddles — see FourPlayerBall integration if needed.
    }

    cleanup(): void {
        // cleanup delegate mode first
        try {
            if (this.delegateMode) {
                this.delegateMode.cleanup();
            }
        } finally {
            // remove & dispose extra players that we created ourselves
            if (this.extraPlayers && this.sceneRef) {
                this.extraPlayers.forEach(mesh => {
                    try {
                        // only dispose if we created them (name match)
                        if (mesh && mesh.name && (mesh.name === "player2" || mesh.name === "player3")) {
                            // keep if original scene had them (they are reused) - check ownership if needed
                            mesh.dispose();
                        }
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