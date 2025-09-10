const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

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

function verifyTOTPToken(token, secret, window = 2) {
  if (!token || !secret) {
    return false;
  }

  const cleanToken = token.replace(/[\s-]/g, '');
  
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

function generateBackupCodes(count = 10) {
  const codes = [];
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g)
      .join('-');
    codes.push(code);
  }
  
  return codes;
}

function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

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

function isValidTOTPSecret(secret) {
  if (!secret || typeof secret !== 'string') {
    return false;
  }
  
  const base32Regex = /^[A-Z2-7]+=*$/;
  return secret.length >= 16 && base32Regex.test(secret);
}

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
  generateTOTPToken
};
