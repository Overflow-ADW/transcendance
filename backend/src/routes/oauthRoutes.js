const OAuthUtils = require('../utils/oauthUtils');
const jwtUtils = require('../utils/jwtUtils');

async function oauthRoutes(fastify, options) {
  const { db } = fastify;

  fastify.get('/google/callback', async (request, reply) => {
    try {
      const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      fastify.log.info('✅ Token Google OAuth reçu');
      
      const userProfile = await OAuthUtils.getGoogleUserProfile(token.access_token);
      
      const user = await OAuthUtils.findOrCreateOAuthUser({
        provider: 'google',
        providerId: userProfile.id,
        email: userProfile.email,
        username: userProfile.name || userProfile.email.split('@')[0],
        displayName: userProfile.name,
        avatar: userProfile.picture
      }, db);

      const { accessToken, refreshToken } = jwtUtils.generateTokenPair({
        userId: user.id,
        username: user.username,
        isAdmin: user.is_admin || false
      });

      return reply.redirect(
        `${process.env.FRONTEND_URL}/oauth/success?token=${accessToken}&refresh=${refreshToken}&provider=google`
      );

    } catch (error) {
      fastify.log.error('❌ Erreur callback Google OAuth:', error);
      return reply.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed&provider=google&message=${encodeURIComponent(error.message)}`
      );
    }
  });

  fastify.get('/github/callback', async (request, reply) => {
    try {
      const { token } = await fastify.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      fastify.log.info('✅ Token GitHub OAuth reçu');
      
      const userProfile = await OAuthUtils.getGitHubUserProfile(token.access_token);
      
      const user = await OAuthUtils.findOrCreateOAuthUser({
        provider: 'github',
        providerId: userProfile.id,
        email: userProfile.email,
        username: userProfile.login,
        displayName: userProfile.name || userProfile.login,
        avatar: userProfile.avatar_url
      }, db);

      const { accessToken, refreshToken } = jwtUtils.generateTokenPair({
        userId: user.id,
        username: user.username,
        isAdmin: user.is_admin || false
      });

      return reply.redirect(
        `${process.env.FRONTEND_URL}/oauth/success?token=${accessToken}&refresh=${refreshToken}&provider=github`
      );

    } catch (error) {
      fastify.log.error('❌ Erreur callback GitHub OAuth:', error);
      return reply.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed&provider=github&message=${encodeURIComponent(error.message)}`
      );
    }
  });

}

module.exports = oauthRoutes;
