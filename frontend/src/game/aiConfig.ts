import { AIDifficulty, AIConfig } from "./aiTypes";

export const AI_CONFIGS: Record<AIDifficulty, AIConfig> = {
    [AIDifficulty.EASY]: {
        useSnapshotSystem: true,    
        precisionFactor: 0.6,
        reactionTime: 1600,
        positionError: 45,
        anticipationRange: 150,
        movementSpeed: 1.0          
    },
    [AIDifficulty.MEDIUM]: {
        useSnapshotSystem: true,    
        precisionFactor: 0.8,
        reactionTime: 600,
        positionError: 25,
        anticipationRange: 350,
        movementSpeed: 1.0          
    },
    [AIDifficulty.HARD]: {
        useSnapshotSystem: true,    
        precisionFactor: 0.92,
        reactionTime: 80,
        positionError: 8,
        anticipationRange: 450,
        movementSpeed: 1.0          
    }
};

export function getDifficultyName(difficulty: AIDifficulty): string {
    const names = {
        [AIDifficulty.EASY]: "EASY",
        [AIDifficulty.MEDIUM]: "MEDIUM", 
        [AIDifficulty.HARD]: "HARD"
    };
    return names[difficulty] || "MEDIUM";
}
