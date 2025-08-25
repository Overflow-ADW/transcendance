const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

// voir passage prod
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function userRoutes(fastify, options) {
  const db = fastify.db;

  fastify.post('/register', async (request, reply) => {
    try {
      const { username, email, password } = request.body;

      if (!username || !email || !password) {
        return reply.status(400).send({
          error: 'Tous les champs sont requis',
          details: 'username, email et password sont obligatoires'
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.status(400).send({
          error: 'Format d\'email invalide'
        });
      }

      if (password.length < 6) {
        return reply.status(400).send({
          error: 'Le mot de passe doit contenir au moins 6 caractères'
        });
      }

      const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
      if (existingUser) {
        return reply.status(409).send({
          error: 'Utilisateur déjà existant',
          details: existingUser.username === username ? 'Ce nom d\'utilisateur est déjà pris' : 'Cette adresse email est déjà utilisée'
        });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const insertUser = db.prepare(`
        INSERT INTO users (username, email, password, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);

      const result = insertUser.run(username, email, hashedPassword);

      const token = jwt.sign(
        { 
          userId: result.lastInsertRowid, 
          username: username 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      fastify.log.info(`Nouvel utilisateur enregistré: ${username}`);

      return reply.status(201).send({
        message: 'Utilisateur créé avec succès',
        user: {
          id: result.lastInsertRowid,
          username: username,
          email: email
        },
        token: token
      });

    } catch (error) {
      fastify.log.error('Erreur lors de l\'enregistrement:', error);
      return reply.status(500).send({
        error: 'Erreur interne du serveur',
        details: 'Une erreur est survenue lors de la création du compte'
      });
    }
  });

  // Route de connexion
  fastify.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body;

      // Validation des données
      if (!username || !password) {
        return reply.status(400).send({
          error: 'Nom d\'utilisateur et mot de passe requis'
        });
      }

      // Récupérer l'utilisateur par nom d'utilisateur ou email
      const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
      
      if (!user) {
        return reply.status(401).send({
          error: 'Identifiants invalides',
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
module.exports = userRoutes;
