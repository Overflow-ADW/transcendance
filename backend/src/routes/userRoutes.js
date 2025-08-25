// src/routes/userRoutes.js
const { authenticateToken } = require('../middleware/auth');

async function userRoutes(fastify, options) {
  const db = fastify.db;

  fastify.get('/profile', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(request.user.userId);
      
      if (!user) {
        return reply.status(404).send({
          error: 'Utilisateur non trouvé'
        });
      }

      return reply.send({
        user: user
      });

    } catch (error) {
      fastify.log.error('Erreur lors de la récupération du profil:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur'
      });
    }
  });
  // TODO: Ajoutez ici les routes pour mettre à jour le profil, l'avatar, etc.
}

module.exports = userRoutes;