
function ensureNotAuthenticated(request, reply, done) {
  const authHeader = request.headers.authorization;
  const token = request.cookies?.jwt;

  if (token || (authHeader && authHeader.startsWith('Bearer '))) {
    return reply.status(403).send({
      error: 'Vous êtes déjà connecté',
      code: 'ALREADY_AUTHENTICATED',
      redirect: '/profile'
    });
  }

  done();
}

function ensureAuthenticated(request, reply, done) {
  const authHeader = request.headers.authorization;
  const token = request.cookies?.jwt;

  if (!token && (!authHeader || !authHeader.startsWith('Bearer '))) {
    return reply.status(401).send({
      error: 'Authentification requise',
      code: 'AUTHENTICATION_REQUIRED',
      redirect: '/login'
    });
  }
  done();
}

function ensureAdmin(request, reply, done) {
  if (!request.user || !request.user.userId) {
    return reply.status(401).send({
      error: 'Authentification requise',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }

  if (!request.user.isAdmin) {
    return reply.status(403).send({
      error: 'Accès refusé. Privilèges administrateur requis.',
      code: 'ADMIN_REQUIRED'
    });
  }
  done();
}

module.exports = {
  ensureNotAuthenticated,
  ensureAuthenticated,
  ensureAdmin
};
