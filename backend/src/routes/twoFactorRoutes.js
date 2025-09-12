const { 
  generateTOTPSecret, 
  generateQRCode, 
  verifyTOTPToken, 
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  isValidTOTPSecret 
} = require('../utils/twoFactorUtils');
const { authenticateToken } = require('../middleware/auth');
const { generateTokenPair } = require('../utils/jwtUtils');
const Joi = require('joi');

const enableTwoFactorSchema = Joi.object({
  token: Joi.string().pattern(/^\d{6}$/).required()
});

const verifyTwoFactorSchema = Joi.object({
  token: Joi.string().pattern(/^\d{6}$/).required()
});

const disableTwoFactorSchema = Joi.object({
  password: Joi.string().min(8).required(),
  token: Joi.string().pattern(/^\d{6}$/).required()
});

const verifyBackupCodeSchema = Joi.object({
  backupCode: Joi.string().pattern(/^[A-F0-9]{4}-[A-F0-9]{4}$/).required()
});

async function twoFactorRoutes(fastify, options) {
  
  fastify.post('/setup', { 
    preHandler: [authenticateToken] 
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const username = request.user.username;

      const user = fastify.db.prepare('SELECT two_factor_enabled FROM users WHERE id = ?').get(userId);
      
      if (user.two_factor_enabled) {
        return reply.code(400).send({
          error: 'Authentification à deux facteurs déjà activée',
          message: 'Désactivez d\'abord l\'A2F existante'
        });
      }

      const secretData = generateTOTPSecret(username);
      
      const qrCodeImage = await generateQRCode(secretData.otpauthUrl);

      fastify.db.prepare(`
        UPDATE users 
        SET two_factor_temp_secret = ? 
        WHERE id = ?
      `).run(secretData.secret, userId);

      fastify.log.info(`Setup 2FA initié pour l'utilisateur ${userId}`);

      reply.send({
        success: true,
        setup: {
          secret: secretData.secret,
          qrCode: qrCodeImage,
          manualEntryKey: secretData.secret,
          instructions: {
            fr: "Scannez ce QR code avec Google Authenticator ou entrez la clé manuellement, puis validez avec un code à 6 chiffres",
            en: "Scan this QR code with Google Authenticator or enter the key manually, then validate with a 6-digit code"
          }
        }
      });

    } catch (error) {
      fastify.log.error('Erreur lors du setup 2FA:', error);
      reply.code(500).send({ 
        error: 'Erreur interne du serveur',
        message: 'Impossible de configurer l\'authentification à deux facteurs'
      });
    }
  });

  fastify.post('/enable', { 
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { token } = request.body;
      if (!token || !/^\d{6}$/.test(token)) {
        return reply.code(400).send({ 
          error: 'Token invalide',
          message: 'Le token doit être composé de 6 chiffres'
        });
      }
      
      const userId = request.user.userId;

      const user = fastify.db.prepare(`
        SELECT two_factor_temp_secret, two_factor_enabled 
        FROM users 
        WHERE id = ?
      `).get(userId);

      if (!user) {
        return reply.code(404).send({ error: 'Utilisateur non trouvé' });
      }

      if (user.two_factor_enabled) {
        return reply.code(400).send({ 
          error: 'Authentification à deux facteurs déjà activée' 
        });
      }

      if (!user.two_factor_temp_secret) {
        return reply.code(400).send({ 
          error: 'Aucune configuration 2FA en cours',
          message: 'Initiez d\'abord la configuration avec /2fa/setup'
        });
      }

      const isValidToken = verifyTOTPToken(token, user.two_factor_temp_secret);
      
      if (!isValidToken) {
        fastify.log.warn(`Tentative d'activation 2FA avec token invalide - User: ${userId}`);
        return reply.code(400).send({ 
          error: 'Invalid verification code',
          message: 'Verify the 6 digits code and try again'
        });
      }

      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code));

      fastify.db.prepare(`
        UPDATE users 
        SET 
          two_factor_enabled = 1,
          two_factor_secret = ?,
          two_factor_temp_secret = NULL,
          two_factor_backup_codes = ?
        WHERE id = ?
      `).run(
        user.two_factor_temp_secret, 
        JSON.stringify(hashedBackupCodes),
        userId
      );

      fastify.log.info(`2FA activé avec succès pour l'utilisateur ${userId}`);

      reply.send({
        success: true,
        message: 'Authentification à deux facteurs activée avec succès',
        backupCodes: backupCodes,
        warning: 'Sauvegardez ces codes de récupération dans un endroit sûr. Ils ne seront plus affichés.'
      });

    } catch (error) {
      fastify.log.error('Erreur lors de l\'activation 2FA:', error);
      reply.code(500).send({ 
        error: 'Erreur interne du serveur',
        message: 'Impossible d\'activer l\'authentification à deux facteurs'
      });
    }
  });

  fastify.get('/status', { 
    preHandler: [authenticateToken] 
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;

      const user = fastify.db.prepare(`
        SELECT 
          two_factor_enabled,
          two_factor_backup_codes,
          (two_factor_temp_secret IS NOT NULL) as setup_in_progress
        FROM users 
        WHERE id = ?
      `).get(userId);

      if (!user) {
        return reply.code(404).send({ error: 'Utilisateur non trouvé' });
      }

      let remainingBackupCodes = 0;
      if (user.two_factor_enabled && user.two_factor_backup_codes) {
        const backupCodes = JSON.parse(user.two_factor_backup_codes);
        remainingBackupCodes = backupCodes.length;
      }

      reply.send({
        enabled: !!user.two_factor_enabled,
        setupInProgress: !!user.setup_in_progress,
        remainingBackupCodes: remainingBackupCodes,
        recommendations: {
          backupCodesLow: remainingBackupCodes <= 2 && remainingBackupCodes > 0,
          noBackupCodes: remainingBackupCodes === 0
        }
      });

    } catch (error) {
      fastify.log.error('Erreur lors de la récupération du statut 2FA:', error);
      reply.code(500).send({ 
        error: 'Erreur interne du serveur',
        message: 'Impossible de récupérer le statut 2FA'
      });
    }
  });

  fastify.post('/verify', async (request, reply) => {
    try {
      const { token, tempUserId } = request.body;

      if (!token || !/^\d{6}$/.test(token)) {
        return reply.code(400).send({ 
          error: 'Token invalide',
          message: 'Le token doit être composé de 6 chiffres'
        });
      }

      if (!tempUserId) {
        return reply.code(400).send({ 
          error: 'ID utilisateur manquant',
          message: 'L\'identifiant temporaire est requis'
        });
      }

      const user = fastify.db.prepare(`
        SELECT 
          id, username, email, two_factor_enabled, two_factor_secret, 
          two_factor_backup_codes, is_admin, status, created_at
        FROM users 
        WHERE id = ? AND two_factor_enabled = 1
      `).get(tempUserId);

      if (!user) {
        return reply.code(404).send({ 
          error: 'Utilisateur non trouvé ou 2FA non activé' 
        });
      }

      const isValidToken = verifyTOTPToken(token, user.two_factor_secret);
      
      if (!isValidToken) {
        let backupCodes = [];
        if (user.two_factor_backup_codes) {
          try {
            backupCodes = JSON.parse(user.two_factor_backup_codes);
          } catch (e) {
            backupCodes = [];
          }
        }

        const backupResult = verifyBackupCode(token.toUpperCase(), backupCodes);
        
        if (backupResult.isValid) {
          const remainingCodes = backupCodes.filter(code => code !== backupResult.usedCodeHash);
          
          fastify.db.prepare(`
            UPDATE users 
            SET two_factor_backup_codes = ? 
            WHERE id = ?
          `).run(JSON.stringify(remainingCodes), user.id);

          fastify.log.info(`Code de sauvegarde utilisé pour l'utilisateur ${user.id}`);
        } else {
          fastify.log.warn(`Tentative de connexion 2FA avec token invalide - User: ${user.id}`);
          return reply.code(400).send({ 
            error: 'Invalide verification code',
            message: 'Verify your 6 digits code or use backup codes'
          });
        }
      }

      const { accessToken, refreshToken } = generateTokenPair({
        userId: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin
      });

      fastify.log.info(`Connexion 2FA réussie pour l'utilisateur ${user.id}`);

      reply.send({
        success: true,
        message: '2FA success',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_admin: !!user.is_admin,
          two_factor_enabled: true,
          status: user.status,
          created_at: user.created_at
        },
        accessToken,
        refreshToken
      });

    } catch (error) {
      fastify.log.error('Error verifying 2fa:', error);
      reply.code(500).send({ 
        error: 'Erreur interne du serveur',
        message: 'Impossible to verify 2fa code'
      });
    }
  });

  fastify.post('/disable', { 
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { password, token } = request.body;
      
      if (!password || password.length < 8) {
        return reply.code(400).send({ 
          error: 'password is required',
          message: 'The password is required to disable 2FA'
        });
      }

      if (!token || !/^\d{6}$/.test(token)) {
        return reply.code(400).send({ 
          error: 'Verification code required',
          message: 'A 6-digit verification code is required'
        });
      }

      const userId = request.user.userId;

      const user = fastify.db.prepare(`
        SELECT 
          id, password, two_factor_enabled, two_factor_secret, 
          two_factor_backup_codes
        FROM users 
        WHERE id = ?
      `).get(userId);

      if (!user) {
        return reply.code(404).send({ error: 'Utilisateur non trouvé' });
      }

      if (!user.two_factor_enabled) {
        return reply.code(400).send({ 
          error: '2FA inactive' 
        });
      }

      const bcrypt = require('bcrypt');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return reply.code(400).send({ 
          error: 'Incorrect password',
          message: 'Actual password is not valid'
        });
      }

      let isValidCode = verifyTOTPToken(token, user.two_factor_secret);
      
      if (!isValidCode && user.two_factor_backup_codes) {
        let backupCodes = [];
        try {
          backupCodes = JSON.parse(user.two_factor_backup_codes);
        } catch (e) {
          backupCodes = [];
        }
        
        const backupResult = verifyBackupCode(token.toUpperCase(), backupCodes);
        isValidCode = backupResult.isValid;
      }

      if (!isValidCode) {
        fastify.log.warn(`Tentative de désactivation 2FA avec code invalide - User: ${userId}`);
        return reply.code(400).send({ 
          error: 'Invliad verification code',
          message: 'Verify your 6 digits code or use backup codes'
        });
      }

      fastify.db.prepare(`
        UPDATE users 
        SET 
          two_factor_enabled = 0,
          two_factor_secret = NULL,
          two_factor_temp_secret = NULL,
          two_factor_backup_codes = NULL
        WHERE id = ?
      `).run(userId);

      fastify.log.info(`2FA disabled for ${userId}`);

      reply.send({
        success: true,
        message: '2FA disabled with success'
      });

    } catch (error) {
      fastify.log.error('Erreur lors de la désactivation 2FA:', error);
      reply.code(500).send({ 
        error: 'Intenal Server Error',
        message: 'Cannot deactivate 2FA'
      });
    }
  });
}

module.exports = twoFactorRoutes;