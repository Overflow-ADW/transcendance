const axios = require('axios');
const crypto = require('crypto');

/**
 * Utilitaires OAuth pour Google et GitHub
 */
class OAuthUtils {
  /**
   * Génère un state sécurisé pour OAuth
   * @returns {string} State aléatoire
   */
  static generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Récupère les informations utilisateur depuis Google
   * @param {string} accessToken - Token d'accès Google
   * @returns {Object} Profil utilisateur Google
   */
  static async getGoogleUserInfo(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'transcendance-app/1.0'
        },
        timeout: 10000
      });
      
      return {
        provider: 'google',
        providerId: response.data.id,
        email: response.data.email,
        name: response.data.name,
        avatar: response.data.picture,
        verified: response.data.verified_email,
        locale: response.data.locale
      };
    } catch (error) {
      throw new Error(`Erreur récupération profil Google: ${error.message}`);
    }
  }

  /**
   * Récupère les informations utilisateur depuis GitHub
   * @param {string} accessToken - Token d'accès GitHub
   * @returns {Object} Profil utilisateur GitHub
   */
  static async getGitHubUserInfo(accessToken) {
    try {
      // Récupérer profil principal
      const profileResponse = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'transcendance-app/1.0',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000
      });

      // Récupérer emails (privé si nécessaire)
      let email = profileResponse.data.email;
      if (!email) {
        try {
          const emailsResponse = await axios.get('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'User-Agent': 'transcendance-app/1.0',
              'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 5000
          });
          
          const primaryEmail = emailsResponse.data.find(e => e.primary && e.verified);
          email = primaryEmail ? primaryEmail.email : emailsResponse.data[0]?.email;
        } catch (emailError) {
          // Si on ne peut pas récupérer l'email, utiliser un fallback
          console.warn('Impossible de récupérer l\'email GitHub:', emailError.message);
        }
      }

      return {
        provider: 'github',
        providerId: profileResponse.data.id.toString(),
        email: email,
        name: profileResponse.data.name || profileResponse.data.login,
        username: profileResponse.data.login,
        avatar: profileResponse.data.avatar_url,
        verified: true, // GitHub vérifie les comptes
        bio: profileResponse.data.bio,
        location: profileResponse.data.location
      };
    } catch (error) {
      throw new Error(`Erreur récupération profil GitHub: ${error.message}`);
    }
  }

  /**
   * Valide et normalise les données OAuth
   * @param {Object} oauthData - Données du provider OAuth
   * @returns {Object} Données normalisées
   */
  static validateOAuthData(oauthData) {
    const { provider, providerId, email, name, username, avatar } = oauthData;

    if (!provider || !providerId) {
      throw new Error('Données OAuth incomplètes: provider et providerId requis');
    }

    if (!email) {
      throw new Error('Email requis pour l\'authentification OAuth');
    }

    // Générer username unique si absent
    const finalUsername = username || this.generateUsernameFromEmail(email);

    return {
      provider,
      providerId: providerId.toString(),
      email: email.toLowerCase().trim(),
      name: name ? name.trim() : finalUsername,
      username: finalUsername.toLowerCase(),
      avatar: avatar || null,
      verified: oauthData.verified || false
    };
  }

  /**
   * Génère un username à partir d'un email
   * @param {string} email - Email utilisateur
   * @returns {string} Username généré
   */
  static generateUsernameFromEmail(email) {
    const localPart = email.split('@')[0];
    const cleanUsername = localPart.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanUsername}${timestamp}`.toLowerCase();
  }

  /**
   * Vérifie si un compte OAuth existe déjà
   * @param {Object} db - Instance base de données
   * @param {string} provider - Provider OAuth (google/github)
   * @param {string} providerId - ID chez le provider
   * @returns {Object|null} Utilisateur existant ou null
   */
  static async findExistingOAuthUser(db, provider, providerId) {
    try {
      const stmt = db.prepare(`
        SELECT u.*, p.provider, p.provider_id, p.linked_at
        FROM users u
        JOIN oauth_providers p ON u.id = p.user_id  
        WHERE p.provider = ? AND p.provider_id = ?
      `);
      
      return stmt.get(provider, providerId) || null;
    } catch (error) {
      console.error('Erreur recherche utilisateur OAuth:', error);
      return null;
    }
  }

  /**
   * Vérifie si un utilisateur avec cet email existe
   * @param {Object} db - Instance base de données
   * @param {string} email - Email à vérifier
   * @returns {Object|null} Utilisateur existant ou null
   */
  static async findUserByEmail(db, email) {
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
      return stmt.get(email.toLowerCase()) || null;
    } catch (error) {
      console.error('Erreur recherche utilisateur par email:', error);
      return null;
    }
  }

  /**
   * Lie un compte OAuth à un utilisateur existant
   * @param {Object} db - Instance base de données  
   * @param {number} userId - ID utilisateur
   * @param {Object} oauthData - Données OAuth
   * @returns {Object} Résultat de la liaison
   */
  static async linkOAuthAccount(db, userId, oauthData) {
    const { provider, providerId, email } = oauthData;

    try {
      db.prepare('BEGIN').run();

      // Vérifier que ce provider n'est pas déjà lié
      const existingLink = db.prepare(`
        SELECT id FROM oauth_providers 
        WHERE user_id = ? AND provider = ?
      `).get(userId, provider);

      if (existingLink) {
        db.prepare('ROLLBACK').run();
        throw new Error(`Compte ${provider} déjà lié à cet utilisateur`);
      }

      // Vérifier que ce compte OAuth n'est pas lié à un autre utilisateur
      const existingOAuth = db.prepare(`
        SELECT user_id FROM oauth_providers 
        WHERE provider = ? AND provider_id = ?
      `).get(provider, providerId);

      if (existingOAuth && existingOAuth.user_id !== userId) {
        db.prepare('ROLLBACK').run();
        throw new Error(`Ce compte ${provider} est déjà lié à un autre utilisateur`);
      }

      // Créer la liaison OAuth
      const linkStmt = db.prepare(`
        INSERT INTO oauth_providers (user_id, provider, provider_id, email, linked_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      
      linkStmt.run(userId, provider, providerId, email);

      // Mettre à jour la dernière connexion
      const updateStmt = db.prepare(`
        UPDATE users 
        SET last_login = datetime('now'), status = 'online'
        WHERE id = ?
      `);
      
      updateStmt.run(userId);

      db.prepare('COMMIT').run();

      return {
        success: true,
        message: `Compte ${provider} lié avec succès`,
        provider,
        linkedAt: new Date().toISOString()
      };

    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  }

  /**
   * Crée un nouvel utilisateur avec OAuth
   * @param {Object} db - Instance base de données
   * @param {Object} oauthData - Données OAuth validées
   * @returns {Object} Utilisateur créé
   */
  static async createOAuthUser(db, oauthData) {
    const { provider, providerId, email, name, username } = oauthData;

    try {
      db.prepare('BEGIN').run();

      // Vérifier que l'username n'existe pas déjà
      let finalUsername = username;
      let counter = 1;
      
      while (db.prepare('SELECT id FROM users WHERE username = ?').get(finalUsername)) {
        finalUsername = `${username}${counter}`;
        counter++;
      }

      // Créer l'utilisateur
      const userStmt = db.prepare(`
        INSERT INTO users (username, email, password_hash, oauth_provider, created_at, last_login, status)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 'online')
      `);
      
      const result = userStmt.run(
        finalUsername,
        email, 
        'oauth', // Pas de mot de passe pour OAuth
        provider
      );

      const userId = result.lastInsertRowid;

      // Créer la liaison OAuth
      const oauthStmt = db.prepare(`
        INSERT INTO oauth_providers (user_id, provider, provider_id, email, linked_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      
      oauthStmt.run(userId, provider, providerId, email);

      const user = {
        id: userId,
        username: finalUsername,
        email: email,
        oauth_provider: provider,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        status: 'online'
      };

      db.prepare('COMMIT').run();
      return user;

    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  }

  /**
   * Récupère les comptes OAuth liés à un utilisateur
   * @param {Object} db - Instance base de données
   * @param {number} userId - ID utilisateur
   * @returns {Array} Liste des comptes liés
   */
  static getLinkedAccounts(db, userId) {
    try {
      const stmt = db.prepare(`
        SELECT provider, email, linked_at
        FROM oauth_providers
        WHERE user_id = ?
        ORDER BY linked_at DESC
      `);
      
      return stmt.all(userId);
    } catch (error) {
      console.error('Erreur récupération comptes liés:', error);
      return [];
    }
  }

  /**
   * Supprime une liaison OAuth
   * @param {Object} db - Instance base de données
   * @param {number} userId - ID utilisateur
   * @param {string} provider - Provider à délier
   * @returns {boolean} Succès de la suppression
   */
  static unlinkOAuthAccount(db, userId, provider) {
    try {
      const stmt = db.prepare(`
        DELETE FROM oauth_providers
        WHERE user_id = ? AND provider = ?
      `);
      
      const result = stmt.run(userId, provider);
      return result.changes > 0;
    } catch (error) {
      console.error('Erreur déliaison OAuth:', error);
      return false;
    }
  }

  /**
   * Vérifie si l'utilisateur peut délier un compte OAuth
   * @param {Object} db - Instance base de données
   * @param {number} userId - ID utilisateur
   * @returns {boolean} Peut délier
   */
  static canUnlinkAccount(db, userId) {
    try {
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
      const linkedCount = db.prepare(`
        SELECT COUNT(*) as count FROM oauth_providers WHERE user_id = ?
      `).get(userId);

      // Si l'utilisateur a un mot de passe, il peut délier
      if (user && user.password_hash && user.password_hash !== 'oauth') {
        return true;
      }

      // Sinon, il doit avoir plus d'un compte OAuth lié
      return linkedCount && linkedCount.count > 1;
    } catch (error) {
      console.error('Erreur vérification déliaison:', error);
      return false;
    }
  }
}

module.exports = OAuthUtils;
