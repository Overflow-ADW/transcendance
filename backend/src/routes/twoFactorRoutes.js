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
const Joi = require('joi');

// Schémas de validation
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
  
  /**
   * Génère un secret TOTP temporaire pour configuration 2FA
   * POST /api/auth/2fa/setup
   */
  fastify.post('/2fa/setup', { 
    preHandler: [authenticateToken] 
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const username = request.user.username;

      // Vérifie si l'utilisateur a déjà 2FA activé
      const user = fastify.db.prepare('SELECT two_factor_enabled FROM users WHERE id = ?').get(userId);
      
      if (user.two_factor_enabled) {
        return reply.code(400).send({
          error: 'Authentification à deux facteurs déjà activée',
          message: 'Désactivez d\'abord l\'A2F existante'
        });
      }

      // Génère un nouveau secret temporaire
      const secretData = generateTOTPSecret(username);
      
      // Génère le QR code
      const qrCodeImage = await generateQRCode(secretData.otpauthUrl);

      // Stocke le secret temporairement (sera confirmé lors de l'activation)
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

  /**
   * Active l'authentification à deux facteurs
   * POST /api/auth/2fa/enable
   */
  fastify.post('/2fa/enable', { 
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      // Validation manuelle au lieu du schéma Joi
      const { token } = request.body;
      if (!token || !/^\d{6}$/.test(token)) {
        return reply.code(400).send({ 
          error: 'Token invalide',
          message: 'Le token doit être composé de 6 chiffres'
        });
      }
      
      const userId = request.user.userId;

      // Récupère le secret temporaire
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

      // Vérifie le token TOTP
      const isValidToken = verifyTOTPToken(token, user.two_factor_temp_secret);
      
      if (!isValidToken) {
        fastify.log.warn(`Tentative d'activation 2FA avec token invalide - User: ${userId}`);
        return reply.code(400).send({ 
          error: 'Code de vérification invalide',
          message: 'Vérifiez votre code à 6 chiffres et réessayez'
        });
      }

      // Génère les codes de sauvegarde
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code));

      // Active la 2FA et sauvegarde les données
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

  /**
   * Statut 2FA de l'utilisateur
   * GET /api/auth/2fa/status
   */
  fastify.get('/2fa/status', { 
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
}

module.exports = twoFactorRoutes;
