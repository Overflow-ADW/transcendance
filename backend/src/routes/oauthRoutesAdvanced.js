const OAuthUtils = require('../utils/oauthUtils');
const OAuthUtilsAdvanced = require('../utils/oauthUtilsAdvanced');
const jwtUtils = require('../utils/jwtUtils');

async function oauthRoutesAdvanced(fastify, options) {
  const { db } = fastify;

  const linkAccountSchemaAdvanced = {
    type: 'object',
    required: ['provider'],
    properties: {
      provider: {
        type: 'string',
        enum: ['google', 'github', 'microsoft', 'discord']
      },
      authCode: { type: 'string' },
      additionalScopes: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  };

  fastify.get('/providers/extended', async (request, reply) => {
    const providers = ['google', 'github', 'microsoft', 'discord'].map(provider => {
      const config = OAuthUtilsAdvanced.getProviderConfig(provider);
      return {
        ...config,
        available: !!(process.env[`${provider.toUpperCase()}_CLIENT_ID`]),
        configStatus: {
          clientId: !!(process.env[`${provider.toUpperCase()}_CLIENT_ID`]),
          clientSecret: !!(process.env[`${provider.toUpperCase()}_CLIENT_SECRET`])
        }
      };
    });

    return reply.send({
      providers,
      totalAvailable: providers.filter(p => p.available).length
    });
  });

  fastify.post('/validate-config', async (request, reply) => {
    const validationResults = {};

    for (const provider of ['google', 'github', 'microsoft', 'discord']) {
      const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
      const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];

      validationResults[provider] = {
        configured: !!(clientId && clientSecret),
        clientIdPresent: !!clientId,
        clientSecretPresent: !!clientSecret,
        endpoints: OAuthUtilsAdvanced.getProviderConfig(provider)
      };
    }

    return reply.send({
      validation: validationResults,
      timestamp: new Date().toISOString()
    });
  });

  fastify.get('/user/connections', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            userId: { type: 'number' },
            connections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  provider: { type: 'string' },
                  email: { type: 'string' },
                  linkedAt: { type: 'string' },
                  providerConfig: { type: 'object' },
                  lastUsed: { type: 'string' }
                }
              }
            },
            availableProviders: { type: 'array' },
            canUnlink: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;

      const linkedAccounts = OAuthUtils.getLinkedAccounts(db, userId);
      
      const connections = linkedAccounts.map(account => ({
        ...account,
        providerConfig: OAuthUtilsAdvanced.getProviderConfig(account.provider),
        canUnlink: OAuthUtils.canUnlinkAccount(db, userId)
      }));

      const linkedProviders = connections.map(c => c.provider);
      const allProviders = ['google', 'github', 'microsoft', 'discord'];
      const availableProviders = allProviders
        .filter(p => !linkedProviders.includes(p))
        .filter(p => process.env[`${p.toUpperCase()}_CLIENT_ID`])
        .map(p => OAuthUtilsAdvanced.getProviderConfig(p));

      const canUnlink = {};
      linkedProviders.forEach(provider => {
        canUnlink[provider] = OAuthUtils.canUnlinkAccount(db, userId);
      });

      return reply.send({
        userId,
        connections,
        availableProviders,
        canUnlink
      });

    } catch (error) {
      fastify.log.error('❌ Erreur récupération connexions OAuth:', error);
      return reply.code(500).send({
        error: 'Erreur lors de la récupération des connexions OAuth',
        message: error.message
      });
    }
  });

  fastify.post('/refresh-connection/:provider', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['google', 'github', 'microsoft', 'discord'] }
        },
        required: ['provider']
      }
    }
  }, async (request, reply) => {
    try {
      const { provider } = request.params;
      const userId = request.user.userId;

      const linkedAccount = db.prepare(`
        SELECT * FROM oauth_providers 
        WHERE user_id = ? AND provider = ?
      `).get(userId, provider);

      if (!linkedAccount) {
        return reply.code(404).send({
          error: `Aucun compte ${provider} lié`
        });
      }

      await OAuthUtilsAdvanced.logOAuthActivity(db, userId, 'refresh_connection', provider);

      const config = OAuthUtilsAdvanced.getProviderConfig(provider);
      const authUrl = `/api/oauth/${provider}?mode=refresh&userId=${userId}`;

      return reply.send({
        success: true,
        message: `Redirection vers la réautorisation ${provider}`,
        authUrl,
        provider: config
      });

    } catch (error) {
      fastify.log.error('❌ Erreur actualisation connexion OAuth:', error);
      return reply.code(500).send({
        error: 'Erreur lors de l\'actualisation de la connexion',
        message: error.message
      });
    }
  });

  fastify.get('/user/activity', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          provider: { type: 'string', enum: ['google', 'github', 'microsoft', 'discord'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;
      const { limit = 20, provider } = request.query;

      let history = OAuthUtilsAdvanced.getOAuthHistory(db, userId, limit);

      if (provider) {
        history = history.filter(log => log.provider === provider);
      }

      const enrichedHistory = history.map(log => ({
        ...log,
        providerConfig: OAuthUtilsAdvanced.getProviderConfig(log.provider)
      }));

      return reply.send({
        userId,
        activity: enrichedHistory,
        total: enrichedHistory.length,
        filtered: !!provider
      });

    } catch (error) {
      fastify.log.error('❌ Erreur récupération activité OAuth:', error);
      return reply.code(500).send({
        error: 'Erreur lors de la récupération de l\'activité OAuth',
        message: error.message
      });
    }
  });

  fastify.post('/bulk-unlink', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['providers'],
        properties: {
          providers: {
            type: 'array',
            items: { type: 'string', enum: ['google', 'github', 'microsoft', 'discord'] },
            minItems: 1
          },
          confirmPassword: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { providers, confirmPassword } = request.body;
      const userId = request.user.userId;

      if (confirmPassword) {
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
        if (user && user.password_hash !== 'oauth') {
          const bcrypt = require('bcrypt');
          const passwordMatch = await bcrypt.compare(confirmPassword, user.password_hash);
          if (!passwordMatch) {
            return reply.code(401).send({
              error: 'Mot de passe incorrect'
            });
          }
        }
      }

      const results = [];
      let successCount = 0;

      for (const provider of providers) {
        try {
          if (!OAuthUtils.canUnlinkAccount(db, userId)) {
            results.push({
              provider,
              success: false,
              error: 'Cannot unlink last authentication method'
            });
            continue;
          }

          const success = OAuthUtils.unlinkOAuthAccount(db, userId, provider);
          
          if (success) {
            successCount++;
            await OAuthUtilsAdvanced.logOAuthActivity(db, userId, 'bulk_unlink', provider);
          }

          results.push({
            provider,
            success,
            error: success ? null : 'Provider not found or already unlinked'
          });

        } catch (error) {
          results.push({
            provider,
            success: false,
            error: error.message
          });
        }
      }

      fastify.log.info('🔓 Déliaison en masse OAuth', { 
        userId, 
        requested: providers.length,
        successful: successCount 
      });

      return reply.send({
        success: successCount > 0,
        results,
        summary: {
          requested: providers.length,
          successful: successCount,
          failed: providers.length - successCount
        }
      });

    } catch (error) {
      fastify.log.error('❌ Erreur déliaison en masse OAuth:', error);
      return reply.code(500).send({
        error: 'Erreur lors de la déliaison en masse',
        message: error.message
      });
    }
  });

  fastify.get('/stats', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (request, reply) => {
    try {
      const providerStats = db.prepare(`
        SELECT 
          provider,
          COUNT(*) as total_connections,
          COUNT(DISTINCT user_id) as unique_users,
          DATE(MIN(linked_at)) as first_connection,
          DATE(MAX(linked_at)) as last_connection
        FROM oauth_providers 
        GROUP BY provider
      `).all();

      const multiProviderUsers = db.prepare(`
        SELECT 
          user_id,
          COUNT(*) as provider_count,
          GROUP_CONCAT(provider) as providers
        FROM oauth_providers 
        GROUP BY user_id 
        HAVING provider_count > 1
      `).all();

      const recentActivity = db.prepare(`
        SELECT 
          DATE(timestamp) as date,
          action,
          provider,
          COUNT(*) as count
        FROM oauth_logs 
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(timestamp), action, provider
        ORDER BY date DESC
      `).all();

      return reply.send({
        providerStats,
        multiProviderUsers: {
          count: multiProviderUsers.length,
          users: multiProviderUsers
        },
        recentActivity,
        totalOAuthUsers: db.prepare(`
          SELECT COUNT(DISTINCT user_id) as count 
          FROM oauth_providers
        `).get().count
      });

    } catch (error) {
      fastify.log.error('❌ Erreur récupération stats OAuth:', error);
      return reply.code(500).send({
        error: 'Erreur lors de la récupération des statistiques',
        message: error.message
      });
    }
  });

  setInterval(() => {
    OAuthUtilsAdvanced.cleanCache();
  }, 5 * 60 * 1000);
}

module.exports = oauthRoutesAdvanced;
