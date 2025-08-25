const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware d'authentification pour protéger les routes
async function authenticateToken(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Token d\'authentification requis',
        details: 'Veuillez fournir un token Bearer dans l\'en-tête Authorization'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      request.user = decoded; // Ajouter les infos utilisateur à la requête
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return reply.status(401).send({
          error: 'Token expiré',
          details: 'Veuillez vous reconnecter'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return reply.status(401).send({
          error: 'Token invalide',
          details: 'Le token fourni n\'est pas valide'
        });
      } else {
        throw jwtError;
      }
    }
    
  } catch (error) {
    request.log.error('Erreur dans le middleware d\'authentification:', error);
    return reply.status(500).send({
      error: 'Erreur interne du serveur'
    });
  }
}

// Middleware optionnel d'authentification (n'échoue pas si pas de token)
async function optionalAuth(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        request.user = decoded;
      } catch (jwtError) {
        // En mode optionnel, on n'échoue pas, on continue sans utilisateur
        request.user = null;
      }
    } else {
      request.user = null;
    }
    
  } catch (error) {
    request.log.error('Erreur dans le middleware d\'authentification optionnel:', error);
    request.user = null;
  }
}

module.exports = {
  authenticateToken,
  optionalAuth
};
