const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Utilitaires OAuth étendus avec cache et providers additionnels
 */
class OAuthUtilsAdvanced {
  constructor() {
    this.providerCache = new Map();
    this.rateLimiter = new Map();
    this.validProviders = ['google', 'github', 'microsoft', 'discord'];
  }

  /**
   * Configuration des providers OAuth avec paramètres avancés
   */
  static getProviderConfig(provider) {
    const configs = {
      google: {
        name: 'google',
        displayName: 'Google',
        color: '#4285F4',
        icon: 'fab fa-google',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        revokeUrl: 'https://oauth2.googleapis.com/revoke',
        scopes: ['profile', 'email', 'openid'],
        customParams: {
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true'
        }
      },
      github: {
        name: 'github',
        displayName: 'GitHub',
        color: '#24292e',
        icon: 'fab fa-github',
        userInfoUrl: 'https://api.github.com/user',
        emailsUrl: 'https://api.github.com/user/emails',
        scopes: ['user:email', 'read:user'],
        customParams: {
          allow_signup: 'true'
        }
      },
      microsoft: {
        name: 'microsoft',
        displayName: 'Microsoft',
        color: '#0078d4',
        icon: 'fab fa-microsoft',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        tenant: 'common'
      },
      discord: {
        name: 'discord',
        displayName: 'Discord',
        color: '#5865F2',
        icon: 'fab fa-discord',
        userInfoUrl: 'https://discord.com/api/users/@me',
        scopes: ['identify', 'email'],
        customParams: {}
      }
    };

    return configs[provider] || null;
  }

  /**
   * Rate limiting pour les appels API OAuth
   */
  static checkRateLimit(provider, identifier) {
    const key = `${provider}:${identifier}`;
    const now = Date.now();
    const limit = this.rateLimiter.get(key);

    if (limit && now - limit.timestamp < 60000) { // 1 minute
      if (limit.count >= 10) { // Max 10 requêtes par minute
        throw new Error(`Rate limit dépassé pour ${provider}`);
      }
      limit.count++;
    } else {
      this.rateLimiter.set(key, {
        timestamp: now,
        count: 1
      });
    }
  }

  /**
   * Récupération d'informations utilisateur avec cache
   */
  static async getUserInfoWithCache(provider, accessToken) {
    const cacheKey = `${provider}:${this.hashToken(accessToken)}`;
    const cached = this.providerCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 300000) { // Cache 5 minutes
      return cached.data;
    }

    let userInfo;
    switch (provider) {
      case 'google':
        userInfo = await this.getGoogleUserInfo(accessToken);
        break;
      case 'github':
        userInfo = await this.getGitHubUserInfo(accessToken);
        break;
      case 'microsoft':
        userInfo = await this.getMicrosoftUserInfo(accessToken);
        break;
      case 'discord':
        userInfo = await this.getDiscordUserInfo(accessToken);
        break;
      default:
        throw new Error(`Provider ${provider} non supporté`);
    }

    this.providerCache.set(cacheKey, {
      data: userInfo,
      timestamp: Date.now()
    });

    return userInfo;
  }

  /**
   * Hash sécurisé d'un token pour le cache
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }

  /**
   * Récupération Microsoft Graph
   */
  static async getMicrosoftUserInfo(accessToken) {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return {
        provider: 'microsoft',
        providerId: response.data.id,
        email: response.data.mail || response.data.userPrincipalName,
        name: response.data.displayName,
        username: response.data.mailNickname || response.data.userPrincipalName?.split('@')[0],
        avatar: null, // Microsoft Graph nécessite un appel séparé pour la photo
        verified: true,
        jobTitle: response.data.jobTitle,
        officeLocation: response.data.officeLocation
      };
    } catch (error) {
      throw new Error(`Erreur récupération profil Microsoft: ${error.message}`);
    }
  }

  /**
   * Récupération Discord
   */
  static async getDiscordUserInfo(accessToken) {
    try {
      const response = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'transcendance-app/1.0'
        },
        timeout: 10000
      });

      const user = response.data;

      return {
        provider: 'discord',
        providerId: user.id,
        email: user.email,
        name: user.global_name || user.username,
        username: user.username,
        avatar: user.avatar 
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`,
        verified: user.verified,
        discriminator: user.discriminator,
        flags: user.flags
      };
    } catch (error) {
      throw new Error(`Erreur récupération profil Discord: ${error.message}`);
    }
  }

  /**
   * Révocation de tokens OAuth
   */
  static async revokeOAuthToken(provider, token) {
    const config = this.getProviderConfig(provider);
    if (!config?.revokeUrl) {
      throw new Error(`Révocation non supportée pour ${provider}`);
    }

    try {
      await axios.post(config.revokeUrl, 
        `token=${token}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 5000
        }
      );
      return true;
    } catch (error) {
      console.warn(`Erreur révocation token ${provider}:`, error.message);
      return false;
    }
  }

  /**
   * Génération de scope OAuth dynamique
   */
  static buildOAuthScopes(provider, additionalScopes = []) {
    const config = this.getProviderConfig(provider);
    if (!config) {
      throw new Error(`Configuration provider ${provider} introuvable`);
    }

    const baseScopes = config.scopes || [];
    const allScopes = [...baseScopes, ...additionalScopes];
    
    // Déduplication des scopes
    return [...new Set(allScopes)];
  }

  /**
   * Validation avancée des données OAuth avec nettoyage
   */
  static validateOAuthDataAdvanced(oauthData) {
    const { provider, providerId, email, name, username } = oauthData;

    // Validations de base
    if (!provider || !this.validProviders.includes(provider)) {
      throw new Error(`Provider OAuth invalide: ${provider}`);
    }

    if (!providerId) {
      throw new Error('ID provider requis');
    }

    if (!email || !this.isValidEmail(email)) {
      throw new Error('Email valide requis');
    }

    // Nettoyage et normalisation
    const cleanData = {
      provider,
      providerId: String(providerId),
      email: email.toLowerCase().trim(),
      name: this.sanitizeName(name) || this.generateNameFromEmail(email),
      username: this.sanitizeUsername(username) || this.generateUsernameFromEmail(email),
      avatar: oauthData.avatar || null,
      verified: Boolean(oauthData.verified),
      additionalData: this.extractAdditionalData(oauthData)
    };

    return cleanData;
  }

  /**
   * Validation email RFC 5322 simplifiée
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Nettoyage du nom utilisateur
   */
  static sanitizeName(name) {
    if (!name) return null;
    return name.trim().replace(/[<>\"'&]/g, '').substring(0, 100);
  }

  /**
   * Nettoyage du username
   */
  static sanitizeUsername(username) {
    if (!username) return null;
    return username
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/^[._-]+|[._-]+$/g, '') // Supprimer les caractères spéciaux en début/fin
      .substring(0, 30);
  }

  /**
   * Extraction de données additionnelles du provider
   */
  static extractAdditionalData(oauthData) {
    const additionalData = {};
    
    // Données spécifiques par provider
    if (oauthData.provider === 'github') {
      additionalData.githubProfile = {
        bio: oauthData.bio,
        location: oauthData.location,
        publicRepos: oauthData.public_repos
      };
    } else if (oauthData.provider === 'discord') {
      additionalData.discordProfile = {
        discriminator: oauthData.discriminator,
        flags: oauthData.flags
      };
    } else if (oauthData.provider === 'microsoft') {
      additionalData.microsoftProfile = {
        jobTitle: oauthData.jobTitle,
        officeLocation: oauthData.officeLocation
      };
    }

    return additionalData;
  }

  /**
   * Génération de nom à partir de l'email
   */
  static generateNameFromEmail(email) {
    const localPart = email.split('@')[0];
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }

  /**
   * Sauvegarder les logs OAuth pour audit
   */
  static async logOAuthActivity(db, userId, action, provider, details = {}) {
    try {
      const stmt = db.prepare(`
        INSERT INTO oauth_logs (user_id, action, provider, details, timestamp)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);

      stmt.run(userId, action, provider, JSON.stringify(details));
    } catch (error) {
      console.error('Erreur sauvegarde log OAuth:', error);
    }
  }

  /**
   * Récupération de l'historique OAuth d'un utilisateur
   */
  static getOAuthHistory(db, userId, limit = 50) {
    try {
      const stmt = db.prepare(`
        SELECT action, provider, details, timestamp
        FROM oauth_logs
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      return stmt.all(userId, limit).map(log => ({
        ...log,
        details: JSON.parse(log.details)
      }));
    } catch (error) {
      console.error('Erreur récupération historique OAuth:', error);
      return [];
    }
  }

  /**
   * Nettoyage périodique du cache
   */
  static cleanCache() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, value] of this.providerCache) {
      if (now - value.timestamp > 300000) { // 5 minutes
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.providerCache.delete(key));
    
    // Nettoyer aussi le rate limiter
    for (const [key, value] of this.rateLimiter) {
      if (now - value.timestamp > 60000) { // 1 minute
        this.rateLimiter.delete(key);
      }
    }
  }
}

module.exports = OAuthUtilsAdvanced;
