// src/routes/adminRoutes.js
const { authenticateToken } = require('../middleware/auth'); // On peut l'utiliser pour restreindre l'accès

async function adminRoutes(fastify, options) {
  const db = fastify.db;

  fastify.get('/list-users', { preHandler: [authenticateToken] }, async (request, reply) => {
    // add admin verif
    // if (!request.user.isAdmin) return reply.status(403).send({ error: 'Accès refusé' });
    
    try {
      const users = db.prepare('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC').all();
      
      return reply.send({
        users: users,
        count: users.length
      });

    } catch (error) {
      fastify.log.error('Erreur lors de la récupération des utilisateurs:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur'
      });
    }
  });
}

module.exports = adminRoutes;