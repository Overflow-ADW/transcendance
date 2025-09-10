const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');
const { generateTokenPair, refreshAccessToken, invalidateToken, verifyToken } = require('../utils/jwtUtils');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ ERREUR CRITIQUE: JWT_SECRET non défini dans les variables d\'environnement !');
  console.error('📝 Créez un fichier .env avec JWT_SECRET=your-secret-key');
  process.exit(1);
}

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required()
    .messages({
      'string.pattern.base': 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'
    })
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

async function authRoutes(fastify, options) {
  const db = fastify.db;

  fastify.post('/register', { preHandler: fastify.ensureNotAuthenticated }, async (request, reply) => {
    try {
      const { error, value } = registerSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données invalides',
          details: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { username, email, password } = value;

      let existingUser;
      if (email) {
        existingUser = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(username, email);
      } else {
        existingUser = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
      }
      
      if (existingUser) {
        const conflictField = existingUser.username === username ? 'nom d\'utilisateur' : 'adresse email';
        return reply.status(409).send({
          error: 'Utilisateur déjà existant',
          details: `Ce ${conflictField} est déjà utilisé`,
          code: 'USER_EXISTS'
        });
      }

      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const insertUser = db.prepare(`
        INSERT INTO users (username, email, password, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);

      const result = insertUser.run(username, email || null, hashedPassword);

      const tokenPair = generateTokenPair({
        userId: result.lastInsertRowid,
        username: username
      });

      fastify.log.info(`✅ Nouvel utilisateur enregistré: ${username} (ID: ${result.lastInsertRowid})`);

      return reply.status(201).send({
        message: 'Utilisateur créé avec succès',
        user: {
          id: result.lastInsertRowid,
          username: username,
          email: email
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        tokenType: 'Bearer'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de l\'enregistrement:', error.message || error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        details: 'Une erreur est survenue lors de la création du compte',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/login', { preHandler: fastify.ensureNotAuthenticated }, async (request, reply) => {
    try {
      const { error, value } = loginSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données manquantes',
          details: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { username, password } = value;

      const user = db.prepare(`
        SELECT id, username, email, password, display_name, avatar_url, 
               status, is_admin, two_factor_enabled, created_at 
        FROM users 
        WHERE username = ? OR email = ?
      `).get(username, username);
      
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return reply.status(401).send({
          error: 'Identifiants invalides',
          details: 'Nom d\'utilisateur ou mot de passe incorrect',
          code: 'INVALID_CREDENTIALS'
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        fastify.log.warn(`🚨 Tentative de connexion échouée pour: ${username}`);
        return reply.status(401).send({
          error: 'Identifiants invalides',
          details: 'Nom d\'utilisateur ou mot de passe incorrect',
          code: 'INVALID_CREDENTIALS'
        });
      }

      if (user.two_factor_enabled) {
        fastify.log.info(`🔐 2FA requis pour utilisateur: ${user.username} (ID: ${user.id})`);
        
        return reply.send({
          message: 'Authentification 2FA requise',
          requires_2fa: true,
          tempUserId: user.id,
          user: {
            id: user.id,
            username: user.username
          }
        });
      }

      const updateStatus = db.prepare('UPDATE users SET status = ?, last_login = datetime(\'now\') WHERE id = ?');
      updateStatus.run('online', user.id);

      const tokenPair = generateTokenPair({
        userId: user.id,
        username: user.username
      });

      fastify.log.info(`✅ Utilisateur connecté: ${user.username} (ID: ${user.id})`);

      return reply.send({
        message: 'Connexion réussie',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          status: 'online',
          is_admin: user.is_admin,
          two_factor_enabled: false,
          created_at: user.created_at
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        tokenType: 'Bearer'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la connexion:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        details: 'Une erreur est survenue lors de la connexion',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/refresh', { preHandler: [authenticateRefreshToken] }, async (request, reply) => {
    try {
      const { refreshToken } = request.body;
      
      const refreshResult = refreshAccessToken(refreshToken, db);
      
      if (!refreshResult.success) {
        const { error } = refreshResult;
        
        let statusCode = 401;
        if (error.type === 'USER_NOT_FOUND') {
          statusCode = 404;
        }
        
        return reply.status(statusCode).send({
          error: error.message,
          details: error.details,
          code: error.type
        });
      }

      const { tokens, user } = refreshResult;

      fastify.log.info(`🔄 Tokens rafraîchis pour: ${user.username} (ID: ${user.id})`);

      return reply.send({
        message: 'Tokens rafraîchis avec succès',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors du refresh:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        details: 'Une erreur est survenue lors du rafraîchissement des tokens',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/logout', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      fastify.log.info(`🔥 Route /logout appelée pour l'utilisateur: ${request.user.username} (ID: ${request.user.userId})`);
      
      const userId = request.user.userId;
      const tokenId = request.user.jti;

      const updateStatus = db.prepare('UPDATE users SET status = ?, last_logout = datetime(\'now\') WHERE id = ?');
      updateStatus.run('offline', userId);

      if (tokenId) {
        const invalidationResult = invalidateToken(tokenId, db);
        
        if (!invalidationResult.success) {
          fastify.log.warn(`⚠️  Échec de l'invalidation du token ${tokenId}:`, invalidationResult.error);
        }
      }

      fastify.log.info(`👋 Utilisateur déconnecté: ${request.user.username} (ID: ${userId})`);

      return reply.send({
        message: 'Déconnexion réussie',
        code: 'LOGOUT_SUCCESS'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la déconnexion:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/verify', async (request, reply) => {
    try {
      const { token } = request.body;

      if (!token) {
        return reply.status(400).send({
          error: 'Token requis',
          details: 'Le token JWT est obligatoire',
          code: 'MISSING_TOKEN'
        });
      }

      const verification = verifyToken(token, 'access');
      
      if (!verification.success) {
        const { error } = verification;
        
        return reply.status(401).send({
          error: error.message,
          details: error.details,
          code: error.type
        });
      }

      const decoded = verification.payload;
      
      const user = db.prepare('SELECT id, username, email, status, created_at FROM users WHERE id = ?').get(decoded.userId);
      
      if (!user) {
        return reply.status(401).send({
          error: 'Utilisateur non trouvé',
          details: 'Le token fait référence à un utilisateur inexistant',
          code: 'USER_NOT_FOUND'
        });
      }

      const isBlacklisted = require('../utils/jwtUtils').isTokenBlacklisted(decoded.jti, db);
      if (isBlacklisted) {
        return reply.status(401).send({
          error: 'Token révoqué',
          details: 'Ce token a été invalidé',
          code: 'TOKEN_BLACKLISTED'
        });
      }

      return reply.send({
        message: 'Token valide',
        user: user,
        tokenInfo: {
          tokenId: decoded.jti,
          issuedAt: new Date(decoded.iat * 1000).toISOString(),
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          type: decoded.type
        },
        code: 'TOKEN_VALID'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la vérification du token:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  fastify.post('/verify-password', async (request, reply) => {
    try {
      const { error, value } = Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required()
      }).validate(request.body);

      if (error) {
        return reply.status(400).send({
          error: 'Données invalides',
          details: error.details[0].message,
          code: 'VALIDATION_ERROR'
        });
      }

      const { username, password } = value;

      const user = db.prepare(
        'SELECT id, username, password, display_name, avatar_url FROM users WHERE username = ?'
      ).get(username);

      if (!user) {
        return reply.status(401).send({
          error: 'Nom d\'utilisateur ou mot de passe incorrect',
          code: 'INVALID_CREDENTIALS'
        });
      }

      const passwordValid = await bcrypt.compare(password, user.password);
      
      if (!passwordValid) {
        return reply.status(401).send({
          error: 'Nom d\'utilisateur ou mot de passe incorrect',
          code: 'INVALID_CREDENTIALS'
        });
      }

      return reply.send({
        success: true,
        message: 'Mot de passe vérifié',
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url
        },
        code: 'PASSWORD_VERIFIED'
      });

    } catch (error) {
      fastify.log.error('Erreur lors de la vérification du mot de passe:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      });
    }
  });
}

module.exports = authRoutes;
