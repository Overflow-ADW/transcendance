const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Génère un secret TOTP pour un utilisateur
 * @param {string} username - Nom d'utilisateur
 * @param {string} serviceName - Nom du service (optionnel)
 * @returns {Object} Secret et URL pour QR code
 */
function generateTOTPSecret(username, serviceName = 'Transcendance') {
  const secret = speakeasy.generateSecret({
    name: `${serviceName} (${username})`,
    issuer: serviceName,
    length: 32
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCodeUrl: secret.otpauth_url
  };
}

/**
 * Génère une image QR code pour le secret TOTP
 * @param {string} otpauthUrl - URL otpauth du secret
 * @returns {Promise<string>} Image QR code en base64
 */
async function generateQRCode(otpauthUrl) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error('Erreur lors de la génération du QR code: ' + error.message);
  }
}

/**
 * Vérifie un token TOTP
 * @param {string} token - Token à 6 chiffres saisi par l'utilisateur
 * @param {string} secret - Secret TOTP en base32
 * @param {number} window - Fenêtre de tolérance (défaut: 2)
 * @returns {boolean} True si le token est valide
 */
function verifyTOTPToken(token, secret, window = 2) {
  if (!token || !secret) {
    return false;
  }

  // Nettoie le token (supprime espaces et tirets)
  const cleanToken = token.replace(/[\s-]/g, '');
  
  // Vérifie que c'est un token à 6 chiffres
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: cleanToken,
    window: window,
    time: Date.now() / 1000
  });
}

/**
 * Génère des codes de sauvegarde uniques
 * @param {number} count - Nombre de codes à générer (défaut: 10)
 * @returns {string[]} Tableau de codes de sauvegarde
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    // Génère un code de 8 caractères alphanumériques
    const code = crypto.randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g)
      .join('-');
    codes.push(code);
  }
  
  return codes;
}

/**
 * Hash un code de sauvegarde pour stockage sécurisé
 * @param {string} code - Code de sauvegarde
 * @returns {string} Hash du code
 */
function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Vérifie un code de sauvegarde
 * @param {string} inputCode - Code saisi par l'utilisateur
 * @param {string[]} hashedCodes - Codes hachés stockés en base
 * @returns {Object} { isValid: boolean, usedCodeHash?: string }
 */
function verifyBackupCode(inputCode, hashedCodes) {
  if (!inputCode || !hashedCodes || !Array.isArray(hashedCodes)) {
    return { isValid: false };
  }

  const inputHash = hashBackupCode(inputCode.toUpperCase());
  
  const usedCodeHash = hashedCodes.find(hash => hash === inputHash);
  
  return {
    isValid: !!usedCodeHash,
    usedCodeHash: usedCodeHash
  };
}

/**
 * Valide le format d'un secret TOTP
 * @param {string} secret - Secret à valider
 * @returns {boolean} True si le secret est valide
 */
function isValidTOTPSecret(secret) {
  if (!secret || typeof secret !== 'string') {
    return false;
  }
  
  // Un secret base32 valide doit faire au moins 16 caractères
  // et contenir uniquement des caractères base32 valides
  const base32Regex = /^[A-Z2-7]+=*$/;
  return secret.length >= 16 && base32Regex.test(secret);
}

/**
 * Génère un token TOTP pour les tests (utile pour le développement)
 * @param {string} secret - Secret TOTP en base32
 * @returns {string} Token TOTP actuel
 */
function generateTOTPToken(secret) {
  return speakeasy.totp({
    secret: secret,
    encoding: 'base32'
  });
}

module.exports = {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTPToken,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  isValidTOTPSecret,
  generateTOTPToken // Pour les tests uniquement
};
