const { authenticateToken } = require('../middleware/auth');

async function gameRoutes(fastify, options) {
  const db = fastify.db;

  fastify.post('/start', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const { opponentId, gameMode } = request.body;
      const player1Id = request.user.userId;

      // matchmaking, lancement de game, stockage,..

      return reply.status(201).send({
        message: 'Partie démarrée avec succès',
        gameId: 123 // db
      });
    } catch (error) {
      fastify.log.error('Erreur lors du démarrage de la partie:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur'
      });
    }
  });

  // ========================================
  // ROUTE POUR SAUVEGARDER UNE PARTIE TERMINÉE
  // ========================================
  fastify.post('/complete', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['score_player1', 'score_player2', 'duration'],
        properties: {
          player2_id: { type: ['number', 'null'] },
          ai_opponent: { type: 'boolean', default: false },
          ai_level: { type: ['number', 'null'] },
          score_player1: { type: 'number', minimum: 0 },
          score_player2: { type: 'number', minimum: 0 },
          winner_id: { type: ['number', 'null'] },
          duration: { type: 'number', minimum: 0 }, // en secondes
          game_mode: { type: 'string', default: 'classic' },
          tournament_id: { type: ['number', 'null'] }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.userId;
    const gameData = request.body;
    
    try {
      fastify.log.info(`🎮 Sauvegarde partie - Joueur: ${userId}`, {
        player2_id: gameData.player2_id,
        ai_opponent: gameData.ai_opponent,
        scores: `${gameData.score_player1}-${gameData.score_player2}`,
        duration: gameData.duration,
        game_mode: gameData.game_mode
      });

      // Insérer la partie dans la DB
      const result = db.prepare(`
        INSERT INTO games (
          player1_id, player2_id, ai_opponent, ai_level,
          score_player1, score_player2, winner_id,
          duration, game_mode, tournament_id, status,
          start_time, end_time, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 
                  datetime('now', '-' || ? || ' seconds'), 
                  datetime('now'), 
                  datetime('now'))
      `).run(
        userId,                               // player1_id (toujours le joueur connecté)
        gameData.player2_id || null,          // player2_id (null si IA)
        gameData.ai_opponent ? 1 : 0,         // ai_opponent (boolean -> integer)
        gameData.ai_level || null,            // ai_level
        gameData.score_player1,               // score_player1
        gameData.score_player2,               // score_player2
        gameData.winner_id || null,           // winner_id
        gameData.duration,                    // duration
        gameData.game_mode || 'classic',      // game_mode
        gameData.tournament_id || null,       // tournament_id
        gameData.duration                     // pour calculer start_time
      );

      // Les stats utilisateur seront mises à jour automatiquement par les triggers DB
      
      fastify.log.info(`✅ Partie sauvegardée avec succès: ID ${result.lastInsertRowid}`);
      
      return reply.status(201).send({
        success: true,
        gameId: result.lastInsertRowid,
        message: 'Game saved successfully'
      });
      
    } catch (error) {
      fastify.log.error('❌ Erreur sauvegarde partie:', error);
      return reply.status(500).send({
        error: 'Failed to save game results',
        code: 'SAVE_GAME_ERROR',
        details: error.message
      });
    }
  });
}

module.exports = gameRoutes;