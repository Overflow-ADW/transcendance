const { authenticateToken } = require('../middleware/auth');

async function gameRoutes(fastify, options) {
  const db = fastify.db;
  
  fastify.addHook('onRequest', fastify.ensureAuthenticated);

  fastify.post('/start', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const { opponentId, gameMode } = request.body;
      const player1Id = request.user.userId;


      return reply.status(201).send({
        message: 'Partie démarrée avec succès',
        gameId: 123
      });
    } catch (error) {
      fastify.log.error('Erreur lors du démarrage de la partie:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur'
      });
    }
  });

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
          duration: { type: 'number', minimum: 0 },
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
        userId,                              
        gameData.player2_id || null,          
        gameData.ai_opponent ? 1 : 0,         
        gameData.ai_level || null,           
        gameData.score_player1,               
        gameData.score_player2,               
        gameData.winner_id || null,           
        gameData.duration,                            
        gameData.game_mode || 'classic',      
        gameData.tournament_id || null,       
        gameData.duration                           
      );

      
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