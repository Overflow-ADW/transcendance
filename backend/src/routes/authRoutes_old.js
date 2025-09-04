const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');
const { generateTokenPair, refreshAccessToken, invalidateToken, verifyToken } = require('../utils/jwtUtils');

// Sécurité: JWT_SECRET depuis les variables d'environnement (OBLIGATOIRE)
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ ERREUR CRITIQUE: JWT_SECRET non défini dans les variables d\'environnement !');
  console.error('📝 Créez un fichier .env avec JWT_SECRET=your-secret-key');
  process.exit(1);
}

// Schémas de validation Joi
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
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

  // Route d'inscription avec validation renforcée
  fastify.post('/register', async (request, reply) => {
    try {
      // Validation des données avec Joi
      const { error, value } = registerSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données invalides',
          details: error.details[0].message
        });
      }

      const { username, email, password } = value;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(username, email);
      if (existingUser) {
        const conflictField = existingUser.username === username ? 'nom d\'utilisateur' : 'adresse email';
        return reply.status(409).send({
          error: 'Utilisateur déjà existant',
          details: `Ce ${conflictField} est déjà utilisé`
        });
      }

      // Hachage sécurisé du mot de passe
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insertion en base avec transaction
      const insertUser = db.prepare(`
        INSERT INTO users (username, email, password, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);

      const result = insertUser.run(username, email, hashedPassword);

      // Génération des tokens JWT (access + refresh)
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
        expiresIn: tokenPair.expiresIn
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de l\'enregistrement:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        details: 'Une erreur est survenue lors de la création du compte'
      });
    }
  });

  // Route de connexion avec validation
  fastify.post('/login', async (request, reply) => {
    try {
      // Validation des données
      const { error, value } = loginSchema.validate(request.body);
      if (error) {
        return reply.status(400).send({
          error: 'Données manquantes',
          details: error.details[0].message
        });
      }

      const { username, password } = value;

      // Récupérer l'utilisateur par nom d'utilisateur ou email
      const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
      
      if (!user) {
        // Délai constant pour éviter les attaques par timing
        await new Promise(resolve => setTimeout(resolve, 100));
        return reply.status(401).send({
          error: 'Identifiants invalides',
          details: 'Nom d\'utilisateur ou mot de passe incorrect'
        });
      }

      // Vérifier le mot de passe
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        fastify.log.warn(`🚨 Tentative de connexion échouée pour: ${username}`);
        return reply.status(401).send({
          error: 'Identifiants invalides',
          details: 'Nom d\'utilisateur ou mot de passe incorrect'
        });
      }

      // Mettre à jour le statut en ligne
      const updateStatus = db.prepare('UPDATE users SET status = ?, last_login = datetime(\'now\') WHERE id = ?');
      updateStatus.run('online', user.id);

      // Créer les tokens JWT sécurisés (access + refresh)
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
          created_at: user.created_at
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la connexion:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        details: 'Une erreur est survenue lors de la connexion'
      });
    }
  });

  // Route de déconnexion sécurisée
  fastify.post('/logout', { preHandler: [authenticateToken] }, async (request, reply) => {
    try {
      const userId = request.user.userId;

      // Mettre à jour le statut hors ligne
      const updateStatus = db.prepare('UPDATE users SET status = ?, last_logout = datetime(\'now\') WHERE id = ?');
      updateStatus.run('offline', userId);

      fastify.log.info(`👋 Utilisateur déconnecté: ${request.user.username} (ID: ${userId})`);

      return reply.send({
        message: 'Déconnexion réussie'
      });

    } catch (error) {
      fastify.log.error('❌ Erreur lors de la déconnexion:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur'
      });
    }
  });

  // Route de vérification du token améliorée
  fastify.post('/verify', async (request, reply) => {
    try {
      const { token } = request.body;

      if (!token) {
        return reply.status(400).send({
          error: 'Token requis',
          details: 'Le token JWT est obligatoire'
        });
      }

      // Vérifier le token avec toutes les options
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'transcendance-api',
        audience: 'transcendance-client'
      });
      
      // Récupérer les informations utilisateur actualisées
      const user = db.prepare('SELECT id, username, email, status, created_at FROM users WHERE id = ?').get(decoded.userId);
      
      if (!user) {
        return reply.status(401).send({
          error: 'Utilisateur non trouvé',
          details: 'Le token fait référence à un utilisateur inexistant'
        });
      }

      return reply.send({
        message: 'Token valide',
        user: user,
        tokenInfo: {
          issuedAt: new Date(decoded.iat * 1000).toISOString(),
          expiresAt: new Date(decoded.exp * 1000).toISOString()
        }
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return reply.status(401).send({
          error: 'Token invalide',
          details: 'Le token JWT fourni n\'est pas valide'
        });
      } else if (error.name === 'TokenExpiredError') {
        return reply.status(401).send({
          error: 'Token expiré',
          details: 'Le token JWT a expiré, veuillez vous reconnecter'
        });
      } else if (error.name === 'NotBeforeError') {
        return reply.status(401).send({
          error: 'Token non actif',
          details: 'Le token JWT n\'est pas encore actif'
        });
      }

      fastify.log.error('❌ Erreur lors de la vérification du token:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur'
      });
    }
  });
}

module.exports = authRoutes;
          details: 'Nom d\'utilisateur ou mot de passe incorrect'
        });
      }

      // Vérifier le mot de passe
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return reply.status(401).send({
          error: 'Identifiants invalides',
          details: 'Nom d\'utilisateur ou mot de passe incorrect'
        });
      }

      const updateStatus = db.prepare('UPDATE users SET status = ? WHERE id = ?');
      updateStatus.run('online', user.id);
      fastify.log.info(`Statut de l'utilisateur ${user.username} mis à jour : online`);

      // Créer un token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      fastify.log.info(`Utilisateur connecté: ${user.username}`);

      return reply.send({
        message: 'Connexion réussie',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at
        },
        token: token
      });

    } catch (error) {
      fastify.log.error('Erreur lors de la connexion:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        details: 'Une erreur est survenue lors de la connexion'
      });
    }
  });

  fastify.post('/logout', { preHandler: [authenticateToken] }, async (request, reply) => {
  try {
    const userId = request.user.userId;

    const updateStatus = db.prepare('UPDATE users SET status = ? WHERE id = ?');
    updateStatus.run('offline', userId);

    fastify.log.info(`Utilisateur déconnecté: ${request.user.username}`);

    return reply.send({
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    fastify.log.error('Erreur lors de la déconnexion:', error);
    return reply.status(500).send({
      error: 'Erreur interne du serveur'
    });
  }
});

  // Route pour vérifier le token JWT (middleware d'authentification)
  fastify.post('/verify', async (request, reply) => {
    try {
      const { token } = request.body;

      if (!token) {
        return reply.status(400).send({
          error: 'Token requis'
        });
      }

      // Vérifier le token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Récupérer les informations utilisateur actualisées
      const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(decoded.userId);
      
      if (!user) {
        return reply.status(401).send({
          error: 'Utilisateur non trouvé'
        });
      }

      return reply.send({
        message: 'Token valide',
        user: user
      });

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return reply.status(401).send({
          error: 'Token invalide'
        });
      } else if (error.name === 'TokenExpiredError') {
        return reply.status(401).send({
          error: 'Token expiré'
        });
      }

      fastify.log.error('Erreur lors de la vérification du token:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur'
      });
    }
  });
}

module.exports = authRoutes;
