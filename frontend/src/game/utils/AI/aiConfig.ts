import { AIDifficulty, AIConfig } from "./aiTypes";

/**
 * CONFIGURATION OPTIMISÉE POUR L'IA INTELLIGENTE
 * Ajustée pour le nouveau système de snapshots et calculs de trajectoire
 */
export const AI_CONFIGS: Record<AIDifficulty, AIConfig> = {
    [AIDifficulty.EASY]: {
        useSnapshotSystem: true,    
        precisionFactor: 0.75,      // Réduit pour plus d'erreurs humaines
        reactionTime: 180,          // Plus lent pour être prévisible  
        positionError: 25,          // Plus d'erreur pour manquer parfois
        anticipationRange: 250,     // Anticipation réduite
        movementSpeed: 1.0          
    },
    [AIDifficulty.MEDIUM]: {
        useSnapshotSystem: true,    
        precisionFactor: 0.8,      // Bon équilibre
        reactionTime: 120,          // Réaction humaine normale
        positionError: 15,          // Erreur modérée
        anticipationRange: 350,     // Bonne anticipation
        movementSpeed: 1.0          
    },
    [AIDifficulty.HARD]: {
        useSnapshotSystem: true,    
        precisionFactor: 0.92,      // Très précis mais pas parfait
        reactionTime: 80,           // Réaction rapide mais humaine
        positionError: 8,           // Petite erreur pour garder le réalisme
        anticipationRange: 450,     // Excellente anticipation
        movementSpeed: 1.0          
    }
};

/**
 * Helper pour obtenir le nom de la difficulté
 */
export function getDifficultyName(difficulty: AIDifficulty): string {
    const names = {
        [AIDifficulty.EASY]: "Facile",
        [AIDifficulty.MEDIUM]: "Moyen", 
        [AIDifficulty.HARD]: "Difficile"
    };
    return names[difficulty] || "Inconnu";
}
