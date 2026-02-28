/*
 * © 2026 Heady Systems LLC.
 * PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
/**
 * Heady CORS Configuration — Explicit allowlist validation.
 */

function parseAllowedOrigins(value = process.env.ALLOWED_ORIGINS) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateAllowedOrigins({ nodeEnv = process.env.NODE_ENV, allowedOrigins = parseAllowedOrigins() } = {}) {
  if (nodeEnv === 'production' && allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must be configured in production');
  }

  return allowedOrigins;
}

function createCorsOptions({ allowedOrigins = parseAllowedOrigins() } = {}) {
  const allowlist = new Set(allowedOrigins);

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowlist.has(origin));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
    optionsSuccessStatus: 204,
  };
}

module.exports = {
  parseAllowedOrigins,
  validateAllowedOrigins,
  createCorsOptions,
};
