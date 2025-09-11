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

const dbInstance = initDatabase(fastify);
fastify.decorate('db', dbInstance);

fastify.register(require('@fastify/cors'), {
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000', 
    'http://127.0.0.1:3000'
  ],
  credentials: true
});

fastify.register(require('@fastify/rate-limit'), {
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
  skipOnError: true,
  keyGenerator: (request) => {
    const userInfo = request.user ? `_user_${request.user.id}` : '';
    return `${request.ip}${userInfo}`;
  },
  onExceeded: (request, key) => {
    fastify.log.warn(`Rate limit exceeded for ${key}: ${request.ip}`);
  },
  errorResponseBuilder: (request, context) => {
    return {
      error: 'Rate Limit Exceeded',
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      retryAfter: Math.round(context.ttl / 1000),
      details: {
        limit: context.max,
        remaining: context.remaining,
        reset: new Date(Date.now() + context.ttl)
      }
    };
  }
});

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

fastify.register(require('@fastify/cookie'), {
  secret: process.env.SESSION_SECRET || 'a-very-long-secret-key-change-in-production',
  parseOptions: {}
});

fastify.register(require('@fastify/session'), {
  secret: process.env.SESSION_SECRET || 'a-very-long-secret-key-change-in-production',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 30,
    httpOnly: true,
    sameSite: 'lax'
  },
  saveUninitialized: false
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  fastify.register(require('@fastify/oauth2'), {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID,
        secret: process.env.GOOGLE_CLIENT_SECRET
      },
      auth: require('@fastify/oauth2').GOOGLE_CONFIGURATION
    },
    startRedirectPath: '/api/oauth/google',
    callbackUri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/oauth/google/callback`
  });
  fastify.log.info('✅ Google OAuth2 plugin registered with auto redirect');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  fastify.register(require('@fastify/oauth2'), {
    name: 'githubOAuth2',
    scope: ['user:email'],
    credentials: {
      client: {
        id: process.env.GITHUB_CLIENT_ID,
        secret: process.env.GITHUB_CLIENT_SECRET
      },
      auth: require('@fastify/oauth2').GITHUB_CONFIGURATION
    },
    startRedirectPath: '/api/oauth/github',
    callbackUri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/oauth/github/callback`
  });
  fastify.log.info('✅ GitHub OAuth2 plugin registered with auto redirect');
}

const { authenticateToken } = require('./middleware/auth');
const { ensureNotAuthenticated, ensureAuthenticated, ensureAdmin } = require('./middleware/routeGuards');

fastify.decorate('authenticate', authenticateToken);
fastify.decorate('ensureNotAuthenticated', ensureNotAuthenticated);
fastify.decorate('ensureAuthenticated', ensureAuthenticated);
fastify.decorate('ensureAdmin', ensureAdmin);

const OAuthUtils = require('./utils/oauthUtils');
const jwtUtils = require('./utils/jwtUtils');

fastify.get('/api/oauth/google/callback', async (request, reply) => {
  try {
    fastify.log.info('🎯 Callback Google OAuth appelé');
    
    const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
    
    fastify.log.info('✅ Token Google OAuth reçu');
    
    const userProfile = await OAuthUtils.getGoogleUserInfo(token.access_token);
    
    const user = await OAuthUtils.findOrCreateOAuthUser({
      provider: 'google',
      providerId: userProfile.providerId,
      email: userProfile.email,
      username: userProfile.name || userProfile.email.split('@')[0],
      name: userProfile.name,
      avatar: userProfile.avatar
    }, fastify.db);

    const { accessToken, refreshToken } = jwtUtils.generateTokenPair({
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin || false
    });

    return reply.redirect(
      `${process.env.FRONTEND_URL}/oauth/success?token=${accessToken}&refresh=${refreshToken}&provider=google`
    );

  } catch (error) {
    fastify.log.error('❌ Erreur callback Google OAuth:', error);
    return reply.redirect(
      `${process.env.FRONTEND_URL}/login?error=oauth_failed&provider=google&message=${encodeURIComponent(error.message)}`
    );
  }
});

fastify.get('/api/oauth/github/callback', async (request, reply) => {
  try {
    fastify.log.info('🎯 Callback GitHub OAuth appelé');
    
    const { token } = await fastify.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
    
    fastify.log.info('✅ Token GitHub OAuth reçu');
    
    const userProfile = await OAuthUtils.getGitHubUserInfo(token.access_token);
    
    const user = await OAuthUtils.findOrCreateOAuthUser({
      provider: 'github',
      providerId: userProfile.id.toString(),
      email: userProfile.email,
      username: userProfile.login || userProfile.name,
      displayName: userProfile.name,
      avatar: userProfile.avatar_url
    }, fastify.db);

    const { accessToken, refreshToken } = jwtUtils.generateTokenPair({
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin || false
    });

    return reply.redirect(
      `${process.env.FRONTEND_URL}/oauth/success?token=${accessToken}&refresh=${refreshToken}&provider=github`
    );

  } catch (error) {
    fastify.log.error('❌ Erreur callback GitHub OAuth:', error);
    return reply.redirect(
      `${process.env.FRONTEND_URL}/login?error=oauth_failed&provider=github&message=${encodeURIComponent(error.message)}`
    );
  }
});


fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(userRoutes, { prefix: '/api/users' });
fastify.register(gameRoutes, { prefix: '/api/games' });
fastify.register(tournamentRoutes, { prefix: '/api/tournaments' });
fastify.register(twoFactorRoutes, { prefix: '/api/2fa' });
fastify.register(adminRoutes, { prefix: '/api/admin' });

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
});

fastify.get('/', async (request, reply) => {
  return { 
    service: 'Transcendance Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
});

fastify.get('/health', async (request, reply) => {
  try {
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
  
  setTimeout(() => {
    fastify.log.error('Forced shutdown after 10 seconds');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  fastify.log.fatal('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  fastify.log.fatal('Unhandled rejection at:', promise, 'reason:', reason);
  console.error('UNHANDLED PROMISE REJECTION:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

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