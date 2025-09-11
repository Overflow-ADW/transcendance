const { authenticateToken } = require('../middleware/auth');

async function adminRoutes(fastify, options) {
  const db = fastify.db;

  fastify.addHook('onRequest', fastify.ensureAuthenticated);
  fastify.addHook('preHandler', fastify.ensureAdmin);

  fastify.get('/list-users', async (request, reply) => {
    try {
      const users = db.prepare('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC').all();      return reply.send({
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