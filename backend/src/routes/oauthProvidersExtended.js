
async function registerAdditionalOAuthProviders(fastify) {
  try {
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      await fastify.register(require('@fastify/oauth2'), {
        name: 'microsoftOAuth2',
        scope: ['openid', 'profile', 'email', 'User.Read'],
        credentials: {
          client: {
            id: process.env.MICROSOFT_CLIENT_ID,
            secret: process.env.MICROSOFT_CLIENT_SECRET
          },
          auth: {
            authorizeHost: 'https://login.microsoftonline.com',
            authorizePath: '/common/oauth2/v2.0/authorize',
            tokenHost: 'https://login.microsoftonline.com',
            tokenPath: '/common/oauth2/v2.0/token'
          }
        },
        startRedirectPath: '/api/oauth/microsoft',
        callbackUri: `${process.env.BACKEND_URL}/api/oauth/microsoft/callback`
      });

      fastify.log.info('✅ Microsoft OAuth2 configuré');
    }

    if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
      await fastify.register(require('@fastify/oauth2'), {
        name: 'discordOAuth2',
        scope: ['identify', 'email'],
        credentials: {
          client: {
            id: process.env.DISCORD_CLIENT_ID,
            secret: process.env.DISCORD_CLIENT_SECRET
          },
          auth: {
            authorizeHost: 'https://discord.com',
            authorizePath: '/api/oauth2/authorize',
            tokenHost: 'https://discord.com',
            tokenPath: '/api/oauth2/token'
          }
        },
        startRedirectPath: '/api/oauth/discord',
        callbackUri: `${process.env.BACKEND_URL}/api/oauth/discord/callback`
      });

      fastify.log.info('✅ Discord OAuth2 configuré');
    }

  } catch (error) {
    fastify.log.error('❌ Erreur configuration OAuth providers additionnels:', error);
    throw error;
  }
}

async function microsoftOAuthRoutes(fastify, options) {
  const { db } = fastify;
  const OAuthUtils = require('../utils/oauthUtils');
  const OAuthUtilsAdvanced = require('../utils/oauthUtilsAdvanced');
  const jwtUtils = require('../utils/jwtUtils');

  fastify.get('/microsoft', async (request, reply) => {
    try {
      const state = OAuthUtils.generateState();
      
      if (!request.session) {
        request.session = {};
      }
      request.session.oauth_state = state;
      
      const authUrl = fastify.microsoftOAuth2.generateAuthorizationUri({
        state,
        response_type: 'code',
        response_mode: 'query'
      });

      fastify.log.info('🔄 Redirection vers Microsoft OAuth', { 
        state: state.substring(0, 8) + '...'
      });

      return reply.redirect(authUrl);

    } catch (error) {
      fastify.log.error('❌ Erreur redirection Microsoft OAuth:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_setup_failed&provider=microsoft`);
    }
  });

  fastify.get('/microsoft/callback', async (request, reply) => {
    try {
      const { code, state, error } = request.query;

      fastify.log.info('📥 Callback Microsoft OAuth reçu', { 
        hasCode: !!code, 
        hasState: !!state, 
        error 
      });

      if (error) {
        fastify.log.error('❌ Erreur OAuth Microsoft', { error });
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_denied&provider=microsoft`);
      }

      if (!code) {
        fastify.log.error('❌ Code d\'autorisation manquant');
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=missing_code&provider=microsoft`);
      }

      const sessionState = request.session?.oauth_state;
      if (!state || state !== sessionState) {
        fastify.log.error('❌ State OAuth invalide');
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state&provider=microsoft`);
      }

      if (request.session) {
        delete request.session.oauth_state;
      }

      const tokenResult = await fastify.microsoftOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      if (!tokenResult || !tokenResult.access_token) {
        throw new Error('Token d\'accès non reçu de Microsoft');
      }

      const microsoftUser = await OAuthUtilsAdvanced.getMicrosoftUserInfo(tokenResult.access_token);
      const validatedData = OAuthUtilsAdvanced.validateOAuthDataAdvanced(microsoftUser);

      fastify.log.info('✅ Profil Microsoft récupéré', { 
        email: validatedData.email,
        name: validatedData.name,
        providerId: validatedData.providerId
      });

      let user = await OAuthUtils.findExistingOAuthUser(db, 'microsoft', validatedData.providerId);

      if (user) {
        fastify.log.info('🔄 Connexion utilisateur Microsoft existant');
        db.prepare(`
          UPDATE users 
          SET last_login = datetime('now'), status = 'online'
          WHERE id = ?
        `).run(user.id);
      } else {
        const existingUser = await OAuthUtils.findUserByEmail(db, validatedData.email);
        
        if (existingUser) {
          fastify.log.info('🔗 Liaison compte Microsoft à utilisateur existant');
          await OAuthUtils.linkOAuthAccount(db, existingUser.id, validatedData);
          user = existingUser;
        } else {
          fastify.log.info('👤 Création nouvel utilisateur Microsoft');
          user = await OAuthUtils.createOAuthUser(db, validatedData);
        }
      }

      await OAuthUtilsAdvanced.logOAuthActivity(db, user.id, 'login', 'microsoft');

      const tokens = jwtUtils.generateTokenPair({
        userId: user.id,
        username: user.username,
        email: user.email
      });

      fastify.log.info('🎉 Authentification OAuth Microsoft réussie');

      const redirectUrl = `${process.env.FRONTEND_URL}/oauth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&provider=microsoft`;
      return reply.redirect(redirectUrl);

    } catch (error) {
      fastify.log.error('❌ Erreur callback OAuth Microsoft:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed&provider=microsoft&message=${encodeURIComponent(error.message)}`);
    }
  });
}

async function discordOAuthRoutes(fastify, options) {
  const { db } = fastify;
  const OAuthUtils = require('../utils/oauthUtils');
  const OAuthUtilsAdvanced = require('../utils/oauthUtilsAdvanced');
  const jwtUtils = require('../utils/jwtUtils');

  fastify.get('/discord', async (request, reply) => {
    try {
      const state = OAuthUtils.generateState();
      
      if (!request.session) {
        request.session = {};
      }
      request.session.oauth_state = state;
      
      const authUrl = fastify.discordOAuth2.generateAuthorizationUri({
        state,
        response_type: 'code'
      });

      fastify.log.info('🔄 Redirection vers Discord OAuth');
      return reply.redirect(authUrl);

    } catch (error) {
      fastify.log.error('❌ Erreur redirection Discord OAuth:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_setup_failed&provider=discord`);
    }
  });

  fastify.get('/discord/callback', async (request, reply) => {
    try {
      const { code, state, error } = request.query;

      if (error) {
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_denied&provider=discord`);
      }

      if (!code) {
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=missing_code&provider=discord`);
      }

      const sessionState = request.session?.oauth_state;
      if (!state || state !== sessionState) {
        return reply.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state&provider=discord`);
      }

      if (request.session) {
        delete request.session.oauth_state;
      }

      const tokenResult = await fastify.discordOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      if (!tokenResult || !tokenResult.access_token) {
        throw new Error('Token d\'accès non reçu de Discord');
      }

      const discordUser = await OAuthUtilsAdvanced.getDiscordUserInfo(tokenResult.access_token);
      const validatedData = OAuthUtilsAdvanced.validateOAuthDataAdvanced(discordUser);

      let user = await OAuthUtils.findExistingOAuthUser(db, 'discord', validatedData.providerId);

      if (user) {
        db.prepare(`
          UPDATE users 
          SET last_login = datetime('now'), status = 'online'
          WHERE id = ?
        `).run(user.id);
      } else {
        const existingUser = await OAuthUtils.findUserByEmail(db, validatedData.email);
        
        if (existingUser) {
          await OAuthUtils.linkOAuthAccount(db, existingUser.id, validatedData);
          user = existingUser;
        } else {
          user = await OAuthUtils.createOAuthUser(db, validatedData);
        }
      }

      await OAuthUtilsAdvanced.logOAuthActivity(db, user.id, 'login', 'discord');

      const tokens = jwtUtils.generateTokenPair({
        userId: user.id,
        username: user.username,
        email: user.email
      });

      const redirectUrl = `${process.env.FRONTEND_URL}/oauth/success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&provider=discord`;
      return reply.redirect(redirectUrl);

    } catch (error) {
      fastify.log.error('❌ Erreur callback OAuth Discord:', error);
      return reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed&provider=discord&message=${encodeURIComponent(error.message)}`);
    }
  });
}

module.exports = {
  registerAdditionalOAuthProviders,
  microsoftOAuthRoutes,
  discordOAuthRoutes
};
