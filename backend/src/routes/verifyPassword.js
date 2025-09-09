const bcrypt = require('bcrypt');

async function verifyPasswordRoute(fastify, options) {
  fastify.post('/verify-password', async (request, reply) => {
    const { username, password } = request.body;

    try {
      // Récupérer l'utilisateur de la base de données
      const user = fastify.db.prepare('SELECT id, username, password FROM users WHERE username = ?')
        .get(username);

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Vérifier le mot de passe
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Mot de passe vérifié avec succès
      return reply.send({
        success: true,
        userId: user.id
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  });
}

module.exports = verifyPasswordRoute;
