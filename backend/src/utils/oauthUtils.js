const axios = require('axios');
const crypto = require('crypto');

class OAuthUtils {
  static generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async getGoogleUserInfo(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'transcendance-app/1.0'
        },
        timeout: 10000
      });
      
      console.log('🔍 DEBUG - Réponse brute de Google API:', response.data);
      
      const userInfo = {
        provider: 'google',
        providerId: response.data.id,
        email: response.data.email,
        name: response.data.name,
        avatar: response.data.picture,
        verified: response.data.verified_email,
        locale: response.data.locale
      };
      
      console.log('🔍 DEBUG - UserInfo formaté:', userInfo);
      
      return userInfo;
    } catch (error) {
      throw new Error(`Erreur récupération profil Google: ${error.message}`);
    }
  }

  static async getGitHubUserInfo(accessToken) {
    try {
      const profileResponse = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'transcendance-app/1.0',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000
      });

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
        verified: true,
        bio: profileResponse.data.bio,
        location: profileResponse.data.location
      };
    } catch (error) {
      throw new Error(`Erreur récupération profil GitHub: ${error.message}`);
    }
  }

  static validateOAuthData(oauthData) {
    const { provider, providerId, email, name, username, avatar } = oauthData;

    if (!provider || !providerId) {
      throw new Error('Données OAuth incomplètes: provider et providerId requis');
    }

    if (!email) {
      throw new Error('Email requis pour l\'authentification OAuth');
    }

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

  static generateUsernameFromEmail(email) {
    const localPart = email.split('@')[0];
    const cleanUsername = localPart.replace(/[^a-zA-Z0-9]/g, '');
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanUsername}${timestamp}`.toLowerCase();
  }

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

  static async findUserByEmail(db, email) {
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
      return stmt.get(email.toLowerCase()) || null;
    } catch (error) {
      console.error('Erreur recherche utilisateur par email:', error);
      return null;
    }
  }

  static async linkOAuthAccount(db, userId, oauthData) {
    const { provider, providerId, email } = oauthData;

    try {
      db.prepare('BEGIN').run();

      const existingLink = db.prepare(`
        SELECT id FROM oauth_providers 
        WHERE user_id = ? AND provider = ?
      `).get(userId, provider);

      if (existingLink) {
        db.prepare('ROLLBACK').run();
        throw new Error(`Compte ${provider} déjà lié à cet utilisateur`);
      }

      const existingOAuth = db.prepare(`
        SELECT user_id FROM oauth_providers 
        WHERE provider = ? AND provider_id = ?
      `).get(provider, providerId);

      if (existingOAuth && existingOAuth.user_id !== userId) {
        db.prepare('ROLLBACK').run();
        throw new Error(`Ce compte ${provider} est déjà lié à un autre utilisateur`);
      }

      const linkStmt = db.prepare(`
        INSERT INTO oauth_providers (user_id, provider, provider_id, email, linked_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      
      linkStmt.run(userId, provider, providerId, email);

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

  static async findOrCreateOAuthUser(oauthData, db) {
    const { provider, providerId, email, username, name, avatar } = oauthData;

    console.log('🔍 DEBUG findOrCreateOAuthUser - Données reçues:', {
      provider,
      providerId,
      email,
      username,
      name,
      avatar
    });

    try {
      const existingOAuthUser = await this.findExistingOAuthUser(db, provider, providerId);
      if (existingOAuthUser) {
        db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(existingOAuthUser.id);
        return existingOAuthUser;
      }

      const existingUserByEmail = await this.findUserByEmail(db, email);
      if (existingUserByEmail) {
        await this.linkOAuthAccount(db, existingUserByEmail.id, { provider, providerId, email });
        db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(existingUserByEmail.id);
        return existingUserByEmail;
      }

      return await this.createOAuthUser(db, {
        provider,
        providerId,
        email,
        username: username || name || email.split('@')[0],
        name,
        avatar
      });

    } catch (error) {
      console.error('Erreur findOrCreateOAuthUser:', error);
      throw error;
    }
  }

  static async createOAuthUser(db, oauthData) {
    const { provider, providerId, email, name, username } = oauthData;

    try {
      db.prepare('BEGIN').run();

      let finalUsername = username;
      let counter = 1;
      
      while (db.prepare('SELECT id FROM users WHERE username = ?').get(finalUsername)) {
        finalUsername = `${username}${counter}`;
        counter++;
      }

      const userStmt = db.prepare(`
        INSERT INTO users (username, email, password, oauth_provider, oauth_id, status, last_login)
        VALUES (?, ?, ?, ?, ?, 'online', datetime('now'))
      `);
      
      const result = userStmt.run(
        finalUsername,
        email, 
        'oauth',
        provider,
        providerId
      );

      const userId = result.lastInsertRowid;

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

  static canUnlinkAccount(db, userId) {
    try {
      const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
      const linkedCount = db.prepare(`
        SELECT COUNT(*) as count FROM oauth_providers WHERE user_id = ?
      `).get(userId);

      if (user && user.password && user.password !== 'oauth') {
        return true;
      }

      return linkedCount && linkedCount.count > 1;
    } catch (error) {
      console.error('Erreur vérification déliaison:', error);
      return false;
    }
  }
}

module.exports = OAuthUtils;
