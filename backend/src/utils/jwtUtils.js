const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ ERREUR CRITIQUE: JWT_SECRET non défini dans les variables d\'environnement !');
  process.exit(1);
}

function generateTokenPair(payload, options = {}) {
  const tokenId = crypto.randomUUID();
  
  const accessTokenPayload = {
    ...payload,
    jti: tokenId,
    type: 'access',
    iat: Math.floor(Date.now() / 1000)
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    JWT_SECRET,
    {
      expiresIn: options.accessExpiry || process.env.JWT_EXPIRY || '15m',
      issuer: 'transcendance-api',
      audience: 'transcendance-client',
      algorithm: 'HS256'
    }
  );

  const refreshTokenPayload = {
    userId: payload.userId,
    username: payload.username,
    jti: tokenId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    JWT_REFRESH_SECRET,
    {
      expiresIn: options.refreshExpiry || process.env.JWT_REFRESH_EXPIRY || '7d',
      issuer: 'transcendance-api',
      audience: 'transcendance-client',
      algorithm: 'HS256'
    }
  );

  return {
    accessToken,
    refreshToken,
    tokenId,
    expiresIn: options.accessExpiry || process.env.JWT_EXPIRY || '15m'
  };
}

function verifyToken(token, type = 'access') {
  const secret = type === 'refresh' ? JWT_REFRESH_SECRET : JWT_SECRET;
  
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'transcendance-api',
      audience: 'transcendance-client',
      algorithms: ['HS256']
    });

    if (decoded.type !== type) {
      throw new Error(`INVALID_TOKEN_TYPE: Expected ${type}, got ${decoded.type}`);
    }

    return {
      success: true,
      payload: decoded,
      error: null
    };

  } catch (error) {
    let errorType = 'UNKNOWN_ERROR';
    let message = error.message;

    switch (error.name) {
      case 'TokenExpiredError':
        errorType = 'TOKEN_EXPIRED';
        message = 'Le token a expiré';
        break;
      case 'JsonWebTokenError':
        errorType = 'INVALID_TOKEN';
        message = 'Token invalide ou malformé';
        break;
      case 'NotBeforeError':
        errorType = 'TOKEN_NOT_ACTIVE';
        message = 'Token pas encore actif';
        break;
      default:
        if (error.message.startsWith('INVALID_TOKEN_TYPE')) {
          errorType = 'INVALID_TOKEN_TYPE';
          message = error.message;
        }
    }

    return {
      success: false,
      payload: null,
      error: {
        type: errorType,
        message: message,
        details: error.message
      }
    };
  }
}

function refreshAccessToken(refreshToken, db) {
  const verification = verifyToken(refreshToken, 'refresh');
  
  if (!verification.success) {
    return {
      success: false,
      error: verification.error
    };
  }

  const { userId, username, jti } = verification.payload;

  const user = db.prepare('SELECT id, username, email, status FROM users WHERE id = ?').get(userId);
  
  if (!user) {
    return {
      success: false,
      error: {
        type: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
        details: 'L\'utilisateur associé à ce token n\'existe plus'
      }
    };
  }

  const newTokens = generateTokenPair({
    userId: user.id,
    username: user.username
  });

  return {
    success: true,
    tokens: newTokens,
    user: user
  };
}

function invalidateToken(tokenId, db) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO token_blacklist (token_id, invalidated_at)
      VALUES (?, datetime('now'))
    `);
    
    stmt.run(tokenId);
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'DB_ERROR',
        message: 'Erreur lors de l\'invalidation du token',
        details: error.message
      }
    };
  }
}

function isTokenBlacklisted(tokenId, db) {
  try {
    const result = db.prepare('SELECT token_id FROM token_blacklist WHERE token_id = ?').get(tokenId);
    return !!result;
  } catch (error) {
    return false;
  }
}

function cleanupExpiredTokens(db) {
  try {
    const stmt = db.prepare(`
      DELETE FROM token_blacklist 
      WHERE datetime(invalidated_at, '+7 days') < datetime('now')
    `);
    
    const result = stmt.run();
    return {
      success: true,
      deletedCount: result.changes
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateTokenPair,
  verifyToken,
  refreshAccessToken,
  invalidateToken,
  isTokenBlacklisted,
  cleanupExpiredTokens
};
