const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { initDatabase } = require('./db');

const fastify = require('fastify')({
  logger: true
});

const dbInstance = initDatabase(fastify);
fastify.decorate('db', dbInstance);


fastify.register(require('@fastify/cors'), {
  origin: true
});

fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(userRoutes, { prefix: '/api/users' });
fastify.register(gameRoutes, { prefix: '/api/games' });
fastify.register(adminRoutes, { prefix: '/api/admin' });

// Route de test
fastify.get('/', async (request, reply) => {
  return { message: 'Transcendance Backend API is running!' };
});

// Route de santé
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'transcendance-backend'
  };
});

// Démarrer le serveur
const start = async () => {
  try {
    await fastify.listen({
      host: '0.0.0.0',
      port: 3000
    });
    fastify.log.info('Serveur démarré sur http://0.0.0.0:3000');
  } catch (err) {
    fastify.log.error(err);
    // Fermer la connexion à la DB en cas d'erreur
    if (db) db.close();
    process.exit(1);
  }
};

start();