const OAuthUtils = require('../utils/oauthUtils');
const jwtUtils = require('../utils/jwtUtils');

/**
 * Plugin Fastify pour les routes OAuth
 */
async function oauthRoutes(fastify, options) {
  const { db } = fastify;

  // Schémas de validation JSON Schema (compatible Fastify)
  const linkAccountSchema = {
    type: 'object',
    required: ['provider', 'authCode'],
    properties: {
      provider: {
        type: 'string',
        enum: ['google', 'github']
      },
      authCode: {
        type: 'string',
        minLength: 1
      }
    }
  };

  // Registrer les plugins OAuth2 avec gestion d'erreur
  try {
    // Configuration Google OAuth2
    await fastify.register(require('@fastify/oauth2'), {
      name: 'googleOAuth2',
      scope: ['profile', 'email'],
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID,
          secret: process.env.GOOGLE_CLIENT_SECRET
        },
        auth: {
          authorizeHost: 'https://accounts.google.com',
          authorizePath: '/o/oauth2/v2/auth',
          tokenHost: 'https://www.googleapis.com',
          tokenPath: '/oauth2/v4/token'
        }
      },
      startRedirectPath: '/api/oauth/google',
      callbackUri: `${process.env.BACKEND_URL}/api/oauth/google/callback`
    });

    // Configuration GitHub OAuth2
    await fastify.register(require('@fastify/oauth2'), {
      name: 'githubOAuth2', 
      scope: ['user:email'],
      credentials: {
        client: {
          id: process.env.GITHUB_CLIENT_ID,
          secret: process.env.GITHUB_CLIENT_SECRET
        },
        auth: {
          authorizeHost: 'https://github.com',
          authorizePath: '/login/oauth/authorize',
          tokenHost: 'https://github.com',
          tokenPath: '/login/oauth/access_token'
        }
      },
      startRedirectPath: '/api/oauth/github',
      callbackUri: `${process.env.BACKEND_URL}/api/oauth/github/callback`
    });

    fastify.log.info('✅ Plugins OAuth2 enregistrés avec succès');

  } catch (error) {
    fastify.log.error('❌ Erreur configuration OAuth2:', error);
    throw error;
  }

  /**
   * GET /api/oauth/google
   * Redirige vers l'autorisation Google OAuth
   */
  fastify.get('/google', { preHandler: fastify.ensureNotAuthenticated }, async (request, reply) => {
    try {
      const state = OAuthUtils.generateState();
      
      // Stocker le state en session (en production, utiliser Redis)
      if (!request.session) {
        request.session = {};
      }
      request.session.oauth_state = state;
      
      const authUrl = fastify.googleOAuth2.generateAuthorizationUri({
        state,
        access_type: 'offline',
        prompt: 'consent'
      });

      fastify.log.info('🔄 Redirection vers Google OAuth', { 
        state: state.substring(0, 8) + '...',
        url: authUrl.substring(0, 50) + '...'
      });

      return reply.redirect(authUrl);

    } catch (error) {
      fastify.log.error('❌ Erreur redirection Google OAuth:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_setup_failed`);
    }
  });

  /**
   * GET /api/oauth/google/callback  
   * Callback après autorisation Google
   */
  fastify.get('/google/callback', async (request, reply) => {
    try {
      const { code, state, error } = request.query;
      const authHeader = request.headers.authorization;
      const token = request.cookies?.jwt;
      const isAlreadyAuthenticated = !!token || (authHeader && authHeader.startsWith('Bearer '));

      fastify.log.info('📥 Callback Google OAuth reçu', { 
        hasCode: !!code, 
        hasState: !!state, 
        error 
      });

      // Vérifier les erreurs OAuth
      if (error) {
        fastify.log.error('❌ Erreur OAuth Google', { error });
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_denied&provider=google`);
      }

      if (!code) {
        fastify.log.error('❌ Code d\'autorisation manquant');
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=missing_code&provider=google`);
      }

      // Vérifier le state CSRF
      const sessionState = request.session?.oauth_state;
      if (!state || state !== sessionState) {
        fastify.log.error('❌ State OAuth invalide', { 
          received: state?.substring(0, 8) + '...', 
          expected: sessionState?.substring(0, 8) + '...' 
        });
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state&provider=google`);
      }

      // Nettoyer le state de la session
      if (request.session) {
        delete request.session.oauth_state;
      }

      // Échanger le code contre un token
      const tokenResult = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      if (!tokenResult || !tokenResult.access_token) {
        throw new Error('Token d\'accès non reçu de Google');
      }

      // Récupérer les informations utilisateur
      const googleUser = await OAuthUtils.getGoogleUserInfo(tokenResult.access_token);
      const validatedData = OAuthUtils.validateOAuthData(googleUser);

      fastify.log.info('✅ Profil Google récupéré', { 
        email: validatedData.email,
        name: validatedData.name,
        providerId: validatedData.providerId
      });

      // Vérifier si l'utilisateur OAuth existe déjà
      let user = await OAuthUtils.findExistingOAuthUser(db, 'google', validatedData.providerId);

      if (user) {
        // Utilisateur OAuth existant - connexion
        fastify.log.info('🔄 Connexion utilisateur OAuth existant', { 
          userId: user.id,
          username: user.username 
        });
        
        // Mettre à jour dernière connexion
        db.prepare(`
          UPDATE users 
          SET last_login = datetime('now'), status = 'online'
          WHERE id = ?
        `).run(user.id);

      } else {
        // Vérifier si un utilisateur avec cet email existe déjà
        const existingUser = await OAuthUtils.findUserByEmail(db, validatedData.email);
        
        if (existingUser) {
          // Lier le compte OAuth au compte existant
          fastify.log.info('🔗 Liaison compte OAuth à utilisateur existant', { 
            userId: existingUser.id,
            email: validatedData.email 
          });

          await OAuthUtils.linkOAuthAccount(db, existingUser.id, validatedData);
          user = existingUser;

        } else {
          // Créer un nouvel utilisateur
          fastify.log.info('👤 Création nouvel utilisateur OAuth', { 
            email: validatedData.email,
            username: validatedData.username
          });

          user = await OAuthUtils.createOAuthUser(db, validatedData);
        }
      }

      // Générer les tokens JWT
      const tokens = jwtUtils.generateTokenPair({
        userId: user.id,
        username: user.username,
        email: user.email
      });

      fastify.log.info('🎉 Authentification OAuth Google réussie', { 
        userId: user.id,
        username: user.username,
        newUser: !user.last_login || user.created_at === user.last_login
      });

      // Rediriger vers le frontend avec les tokens
      const redirectUrl = `${process.env.FRONTEND_URL}/oauth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&provider=google`;
      return reply.redirect(redirectUrl);

    } catch (error) {
      fastify.log.error('❌ Erreur callback OAuth Google:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed&provider=google&message=${encodeURIComponent(error.message)}`);
    }
  });

  /**
   * GET /api/oauth/github
   * Redirige vers l'autorisation GitHub OAuth
   */
  fastify.get('/github', { preHandler: fastify.ensureNotAuthenticated }, async (request, reply) => {
    try {
      const state = OAuthUtils.generateState();
      
      if (!request.session) {
        request.session = {};
      }
      request.session.oauth_state = state;
      
      const authUrl = fastify.githubOAuth2.generateAuthorizationUri({
        state,
        allow_signup: 'true'
      });

      fastify.log.info('🔄 Redirection vers GitHub OAuth', { 
        state: state.substring(0, 8) + '...',
        url: authUrl.substring(0, 50) + '...'
      });

      return reply.redirect(authUrl);

    } catch (error) {
      fastify.log.error('❌ Erreur redirection GitHub OAuth:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_setup_failed&provider=github`);
    }
  });

  /**
   * GET /api/oauth/github/callback
   * Callback après autorisation GitHub  
   */
  fastify.get('/github/callback', async (request, reply) => {
    try {
      const { code, state, error } = request.query;
      const authHeader = request.headers.authorization;
      const token = request.cookies?.jwt;
      const isAlreadyAuthenticated = !!token || (authHeader && authHeader.startsWith('Bearer '));

      fastify.log.info('📥 Callback GitHub OAuth reçu', { 
        hasCode: !!code, 
        hasState: !!state, 
        error 
      });

      if (error) {
        fastify.log.error('❌ Erreur OAuth GitHub', { error });
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_denied&provider=github`);
      }

      if (!code) {
        fastify.log.error('❌ Code d\'autorisation manquant');
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=missing_code&provider=github`);
      }

      const sessionState = request.session?.oauth_state;
      if (!state || state !== sessionState) {
        fastify.log.error('❌ State OAuth invalide', { 
          received: state?.substring(0, 8) + '...', 
          expected: sessionState?.substring(0, 8) + '...' 
        });
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state&provider=github`);
      }

      // Nettoyer le state
      if (request.session) {
        delete request.session.oauth_state;
      }

      // Échanger le code contre un token
      const tokenResult = await fastify.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      if (!tokenResult || !tokenResult.access_token) {
        throw new Error('Token d\'accès non reçu de GitHub');
      }

      // Récupérer les informations utilisateur
      const githubUser = await OAuthUtils.getGitHubUserInfo(tokenResult.access_token);
      const validatedData = OAuthUtils.validateOAuthData(githubUser);

      fastify.log.info('✅ Profil GitHub récupéré', { 
        email: validatedData.email,
        username: validatedData.username,
        providerId: validatedData.providerId
      });

      // Même logique que Google
      let user = await OAuthUtils.findExistingOAuthUser(db, 'github', validatedData.providerId);

      if (user) {
        // Utilisateur existant
        fastify.log.info('🔄 Connexion utilisateur GitHub existant', { 
          userId: user.id,
          username: user.username 
        });

        db.prepare(`
          UPDATE users 
          SET last_login = datetime('now'), status = 'online'
          WHERE id = ?
        `).run(user.id);

      } else {
        const existingUser = await OAuthUtils.findUserByEmail(db, validatedData.email);
        
        if (existingUser) {
          // Lier au compte existant
          fastify.log.info('🔗 Liaison compte GitHub à utilisateur existant', { 
            userId: existingUser.id,
            email: validatedData.email 
          });

          await OAuthUtils.linkOAuthAccount(db, existingUser.id, validatedData);
          user = existingUser;

        } else {
          // Nouveau compte
          fastify.log.info('👤 Création nouvel utilisateur GitHub', { 
            email: validatedData.email,
            username: validatedData.username
          });

          user = await OAuthUtils.createOAuthUser(db, validatedData);
        }
      }

      // Générer tokens JWT
      const tokens = jwtUtils.generateTokenPair({
        userId: user.id,
        username: user.username,
        email: user.email
      });

      fastify.log.info('🎉 Authentification OAuth GitHub réussie', { 
        userId: user.id,
        username: user.username,
        newUser: !user.last_login || user.created_at === user.last_login
      });

      const redirectUrl = `${process.env.FRONTEND_URL}/oauth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&provider=github`;
      return reply.redirect(redirectUrl);

    } catch (error) {
      fastify.log.error('❌ Erreur callback OAuth GitHub:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed&provider=github&message=${encodeURIComponent(error.message)}`);
    }
  });

  /**
   * POST /api/oauth/link
   * Lie un compte OAuth à un utilisateur connecté
   */
  fastify.post('/link', {
    preHandler: [fastify.authenticate],
    schema: {
      body: linkAccountSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            provider: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { provider } = request.body;
      const userId = request.user.userId;

      fastify.log.info('🔗 Tentative liaison OAuth', { userId, provider });

      // Pour l'instant, rediriger vers l'autorisation OAuth normale
      // Dans une implémentation complète, on stockerait l'userId en session
      // et on ferait la liaison après le callback

      const redirectUrl = `/api/oauth/${provider}?mode=link&userId=${userId}`;
      
      return reply.send({
        success: true,
        message: `Redirection vers l'autorisation ${provider}`,
        redirectUrl
      });

    } catch (error) {
      fastify.log.error('❌ Erreur liaison OAuth:', error);
      return reply.code(500).send({
        error: 'Erreur lors de la liaison du compte',
        message: error.message
      });
    }
  });

  /**
   * GET /api/oauth/accounts
   * Liste les comptes OAuth liés à l'utilisateur
   */
  fastify.get('/accounts', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            userId: { type: 'number' },
            linkedAccounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  provider: { type: 'string' },
                  email: { type: 'string' },
                  linkedAt: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.userId;

      const linkedAccounts = OAuthUtils.getLinkedAccounts(db, userId);

      fastify.log.info('📋 Comptes OAuth récupérés', { 
        userId, 
        count: linkedAccounts.length 
      });

      return reply.send({
        userId,
        linkedAccounts: linkedAccounts.map(account => ({
          provider: account.provider,
          email: account.email,
          linkedAt: account.linked_at
        }))
      });

    } catch (error) {
      fastify.log.error('❌ Erreur récupération comptes OAuth:', error);
      return reply.code(500).send({
        error: 'Erreur lors de la récupération des comptes liés',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/oauth/unlink/:provider
   * Délie un compte OAuth
   */
  fastify.delete('/unlink/:provider', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['google', 'github'] }
        },
        required: ['provider']
      }
    }
  }, async (request, reply) => {
    try {
      const { provider } = request.params;
      const userId = request.user.userId;

      fastify.log.info('🔓 Tentative déliaison OAuth', { userId, provider });

      // Vérifier qu'il restera au moins une méthode de connexion
      if (!OAuthUtils.canUnlinkAccount(db, userId)) {
        return reply.code(400).send({
          error: 'Impossible de délier le dernier compte OAuth',
          message: 'Définissez d\'abord un mot de passe ou liez un autre compte OAuth.'
        });
      }

      // Supprimer la liaison
      const success = OAuthUtils.unlinkOAuthAccount(db, userId, provider);

      if (!success) {
        return reply.code(404).send({
          error: `Aucun compte ${provider} lié trouvé`
        });
      }

      fastify.log.info('🔓 Compte OAuth délié avec succès', { userId, provider });

      return reply.send({
        success: true,
        message: `Compte ${provider} délié avec succès`,
        provider
      });

    } catch (error) {
      fastify.log.error('❌ Erreur déliaison OAuth:', error);
      return reply.code(500).send({
        error: 'Erreur lors de la déliaison du compte',
        message: error.message
      });
    }
  });

  /**
   * GET /api/oauth/providers
   * Liste les providers OAuth disponibles
   */
  fastify.get('/providers', async (request, reply) => {
    return reply.send({
      providers: [
        {
          name: 'google',
          displayName: 'Google',
          authUrl: '/api/oauth/google',
          scopes: ['profile', 'email']
        },
        {
          name: 'github', 
          displayName: 'GitHub',
          authUrl: '/api/oauth/github',
          scopes: ['user:email']
        }
      ]
    });
  });
}

module.exports = oauthRoutes;
