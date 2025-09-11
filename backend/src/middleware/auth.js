const jwt = require('jsonwebtoken');
const { verifyToken, isTokenBlacklisted } = require('../utils/jwtUtils');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ ERREUR CRITIQUE: JWT_SECRET non défini dans les variables d\'environnement !');
  process.exit(1);
}

async function authenticateToken(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Token d\'authentification requis',
        details: 'Veuillez fournir un token Bearer dans l\'en-tête Authorization',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7);
    
    const verification = verifyToken(token, 'access');
    
    if (!verification.success) {
      const { error } = verification;
      
      let statusCode = 401;
      switch (error.type) {
        case 'TOKEN_EXPIRED':
          statusCode = 401;
          break;
        case 'INVALID_TOKEN':
        case 'INVALID_TOKEN_TYPE':
          statusCode = 401;
          break;
        case 'TOKEN_NOT_ACTIVE':
          statusCode = 401;
          break;
        default:
          statusCode = 500;
      }
      
      return reply.status(statusCode).send({
        error: error.message,
        details: error.details,
        code: error.type
      });
    }

    const decoded = verification.payload;

    const db = request.server.db;
    if (db && isTokenBlacklisted(decoded.jti, db)) {
      return reply.status(401).send({
        error: 'Token invalidé',
        details: 'Ce token a été révoqué',
        code: 'TOKEN_BLACKLISTED'
      });
    }

    if (db) {
      const user = db.prepare('SELECT id, username, email, status FROM users WHERE id = ?').get(decoded.userId);
      
      if (!user) {
        return reply.status(401).send({
          error: 'Utilisateur non trouvé',
          details: 'L\'utilisateur associé à ce token n\'existe plus',
          code: 'USER_NOT_FOUND'
        });
      }
      
      request.user = {
        ...decoded,
        currentStatus: user.status,
        email: user.email
      };
    } else {
      request.user = decoded;
    }
    
  } catch (error) {
    request.log.error('Erreur dans le middleware d\'authentification:', error);
    return reply.status(500).send({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_ERROR'
    });
  }
}

async function authenticateRefreshToken(request, reply) {
  try {
    const { refreshToken } = request.body;
    
    if (!refreshToken) {
      return reply.status(400).send({
        error: 'Refresh token requis',
        details: 'Veuillez fournir un refresh token',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const verification = verifyToken(refreshToken, 'refresh');
    
    if (!verification.success) {
      const { error } = verification;
      
      return reply.status(401).send({
        error: error.message,
        details: error.details,
        code: error.type
      });
    }

    const decoded = verification.payload;

    const db = request.server.db;
    if (db && isTokenBlacklisted(decoded.jti, db)) {
      return reply.status(401).send({
        error: 'Refresh token invalidé',
        details: 'Ce refresh token a été révoqué',
        code: 'REFRESH_TOKEN_BLACKLISTED'
      });
    }

    request.refreshTokenPayload = decoded;
    
  } catch (error) {
    request.log.error('Erreur dans le middleware de refresh token:', error);
    return reply.status(500).send({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_ERROR'
    });
  }
}

async function optionalAuth(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        request.user = decoded;
      } catch (jwtError) {
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
  authenticateRefreshToken,
  optionalAuth
};
