// Configuration avec variables d'environnement (AVANT tout autre import)
require('dotenv').config();

const path = require('path');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const twoFactorRoutes = require('./routes/twoFactorRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const { initDatabase } = require('./db');

const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty'
    } : undefined
  }
});

// Initialiser la base de données
const dbInstance = initDatabase(fastify);
fastify.decorate('db', dbInstance);

// Configuration CORS sécurisée
fastify.register(require('@fastify/cors'), {
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ],
  credentials: true
});

// Rate limiting pour sécurité
fastify.register(require('@fastify/rate-limit'), {
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000 // 15 minutes
});

// Headers de sécurité
fastify.register(require('@fastify/helmet'), {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
});

// Configuration des cookies (requis pour les sessions)
fastify.register(require('@fastify/cookie'), {
  secret: process.env.SESSION_SECRET || 'a-very-long-secret-key-change-in-production',
  parseOptions: {}
});

// Configuration des sessions pour OAuth
fastify.register(require('@fastify/session'), {
  secret: process.env.SESSION_SECRET || 'a-very-long-secret-key-change-in-production',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en production
    maxAge: 1000 * 60 * 30, // 30 minutes
    httpOnly: true,
    sameSite: 'lax'
  },
  saveUninitialized: false
});

// Décorateurs pour l'authentification et la protection des routes
const { authenticateToken } = require('./middleware/auth');
const { ensureNotAuthenticated, ensureAuthenticated, ensureAdmin } = require('./middleware/routeGuards');

fastify.decorate('authenticate', authenticateToken);
fastify.decorate('ensureNotAuthenticated', ensureNotAuthenticated);
fastify.decorate('ensureAuthenticated', ensureAuthenticated);
fastify.decorate('ensureAdmin', ensureAdmin);


// IMPORTANT : enregistrer les plugins OAuth2 APRÈS cookie/session, AVANT les routes OAuth
// Google OAuth2
fastify.register(require('@fastify/oauth2'), {
  name: 'googleOAuth2',
  scope: ['profile', 'email'],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET
    },
    auth: {
      authorizeHost: 'https://accounts.google.com',
      authorizePath: '/o/oauth2/v2/auth',
      tokenHost: 'https://www.googleapis.com',
      tokenPath: '/oauth2/v4/token'
    }
  },
  startRedirectPath: '/api/oauth/google',
  callbackUri: `${process.env.BACKEND_URL}/api/oauth/google/callback`
});

// GitHub OAuth2
fastify.register(require('@fastify/oauth2'), {
  name: 'githubOAuth2',
  scope: ['user:email'],
  credentials: {
    client: {
      id: process.env.GITHUB_CLIENT_ID,
      secret: process.env.GITHUB_CLIENT_SECRET
    },
    auth: {
      authorizeHost: 'https://github.com',
      authorizePath: '/login/oauth/authorize',
      tokenHost: 'https://github.com',
      tokenPath: '/login/oauth/access_token'
    }
  },
  startRedirectPath: '/api/oauth/github',
  callbackUri: `${process.env.BACKEND_URL}/api/oauth/github/callback`
});

// Routes API
fastify.register(authRoutes, { prefix: '/api/auth' });
// Routes OAuth de base et étendues
fastify.register(oauthRoutes, { prefix: '/api/oauth' });
const { registerAdditionalOAuthProviders } = require('./routes/oauthProvidersExtended');
fastify.register(async function (fastify) {
  await registerAdditionalOAuthProviders(fastify);
});
// TODO: Réactiver les routes avancées après avoir configuré les middlewares d'authentification
// fastify.register(require('./routes/oauthRoutesAdvanced'), { prefix: '/api/oauth' });

fastify.register(userRoutes, { prefix: '/api/users' });
fastify.register(gameRoutes, { prefix: '/api/games' });
fastify.register(tournamentRoutes, { prefix: '/api/tournaments' });
fastify.register(twoFactorRoutes, { prefix: '/api/2fa' });
fastify.register(adminRoutes, { prefix: '/api/admin' });

// Servir les fichiers statiques (avatars)
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
});

// Route racine
fastify.get('/', async (request, reply) => {
  return { 
    service: 'Transcendance Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
});

// Health check amélioré
fastify.get('/health', async (request, reply) => {
  try {
    // Test de la base de données
    const dbTest = fastify.db.prepare('SELECT 1 as test').get();
    
    return { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'transcendance-backend',
      version: '1.0.0',
      uptime: process.uptime(),
      database: dbTest ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development'
    };
  } catch (error) {
    reply.status(503);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'transcendance-backend', 
      error: error.message
    };
  }
});

// Gestion gracieuse de l'arrêt
const gracefulShutdown = (signal) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);
  
  fastify.close(() => {
    fastify.log.info('Server closed successfully');
    if (dbInstance) {
      dbInstance.close();
      fastify.log.info('Database connection closed');
    }
    process.exit(0);
  });
  
  // Force exit après 10 secondes
  setTimeout(() => {
    fastify.log.error('Forced shutdown after 10 seconds');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  fastify.log.fatal('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  fastify.log.fatal('Unhandled rejection at:', promise, 'reason:', reason);
  console.error('UNHANDLED PROMISE REJECTION:', reason);
  // Optionnel : ne pas arrêter le serveur en dev
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Démarrer le serveur
const start = async () => {
  try {
    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT) || 3000;
    
    await fastify.listen({
      host: host,
      port: port
    });
    
    fastify.log.info(`🚀 Transcendance Backend started successfully on ${host}:${port}`);
    fastify.log.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    fastify.log.info(`🗄️  Database: ${process.env.DATABASE_PATH || 'default path'}`);
    
  } catch (err) {
    console.error('❌ Error starting server:');
    console.error(err);
    console.error('Stack trace:', err.stack);
    fastify.log.error('❌ Error starting server:', err);
    if (dbInstance) {
      dbInstance.close();
    }
    process.exit(1);
  }
};

start();