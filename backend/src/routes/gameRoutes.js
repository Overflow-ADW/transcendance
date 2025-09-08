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
}

module.exports = gameRoutes;