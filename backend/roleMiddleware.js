const jwt = require('jsonwebtoken');

const ROLES = Object.freeze({
  SYSTEM_ADMINISTRATOR: 'SYSTEM_ADMINISTRATOR',
  NORMAL_USER: 'NORMAL_USER',
  STORE_OWNER: 'STORE_OWNER',
});

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return process.env.JWT_SECRET;
}

function getBearerToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string') {
    return null;
  }

  const [scheme, token] = authorization.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

function authenticateToken(request, response, next) {
  const token = getBearerToken(request);
  if (!token) {
    return response.status(401).json({ error: 'Authentication token is required.' });
  }

  try {
    const decodedToken = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (
      !decodedToken
      || typeof decodedToken !== 'object'
      || typeof decodedToken.sub !== 'string'
      || typeof decodedToken.role !== 'string'
      || !Object.values(ROLES).includes(decodedToken.role)
    ) {
      return response.status(401).json({ error: 'Authentication token is invalid.' });
    }

    request.user = decodedToken;
    return next();
  } catch (error) {
    if (error instanceof Error && error.message === 'JWT_SECRET is not configured.') {
      return next(error);
    }

    return response.status(401).json({ error: 'Authentication token is invalid or expired.' });
  }
}

function requireRole(...allowedRoles) {
  return (request, response, next) => authenticateToken(
    request,
    response,
    () => {
      if (!allowedRoles.includes(request.user.role)) {
        return response.status(403).json({
          error: 'You do not have permission to access this resource.',
        });
      }

      return next();
    },
  );
}

module.exports = {
  ROLES,
  authenticateToken,
  requireAuth: authenticateToken,
  requireRole,
};
