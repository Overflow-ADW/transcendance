// src/middleware/routeGuards.js
/**
 * Middlewares de protection de routes pour gérer les accès en fonction
 * de l'état d'authentification
 */

/**
 * Vérifie qu'un utilisateur n'est PAS connecté
 * Utilisé pour protéger les routes d'inscription/connexion
 */
function ensureNotAuthenticated(request, reply, done) {
  // Si un token est présent dans les cookies ou les headers, l'utilisateur est déjà connecté
  const authHeader = request.headers.authorization;
  const token = request.cookies?.jwt;

  if (token || (authHeader && authHeader.startsWith('Bearer '))) {
    return reply.status(403).send({
      error: 'Vous êtes déjà connecté',
      code: 'ALREADY_AUTHENTICATED',
      redirect: '/profile' // Redirection suggérée vers le profil
    });
  }

  // Si pas de token, l'utilisateur n'est pas connecté, on peut continuer
  done();
}

/**
 * Vérifie qu'un utilisateur est connecté (similaire à authenticateToken mais sans décoder le token)
 * Pour les vérifications rapides côté frontend
 */
function ensureAuthenticated(request, reply, done) {
  const authHeader = request.headers.authorization;
  const token = request.cookies?.jwt;

  if (!token && (!authHeader || !authHeader.startsWith('Bearer '))) {
    return reply.status(401).send({
      error: 'Authentification requise',
      code: 'AUTHENTICATION_REQUIRED',
      redirect: '/login' // Redirection suggérée vers la page de connexion
    });
  }

  // Si token présent, l'utilisateur est connecté
  done();
}

/**
 * Middleware pour restreindre l'accès aux administrateurs uniquement
 */
function ensureAdmin(request, reply, done) {
  // Vérifie d'abord si l'utilisateur est authentifié
  if (!request.user || !request.user.userId) {
    return reply.status(401).send({
      error: 'Authentification requise',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  // Vérifie ensuite si l'utilisateur est un administrateur
  if (!request.user.isAdmin) {
    return reply.status(403).send({
      error: 'Accès refusé. Privilèges administrateur requis.',
      code: 'ADMIN_REQUIRED'
    });
  }

  // Si c'est un admin, on continue
  done();
}

module.exports = {
  ensureNotAuthenticated,
  ensureAuthenticated,
  ensureAdmin
};
