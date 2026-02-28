/*
 * © 2026 Heady Systems LLC.
 * PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

const crypto = require('crypto');
const helmet = require('helmet');

function createNonce(req, res, next) {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
}

function getCspDirectives(nodeEnv = process.env.NODE_ENV) {
  const isProduction = nodeEnv === 'production';

  const shared = {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      (req, res) => `'nonce-${res.locals.cspNonce}'`,
      'https://apis.google.com',
      'https://www.gstatic.com',
      'https://cdn.jsdelivr.net',
    ],
    styleSrc: [
      "'self'",
      (req, res) => `'nonce-${res.locals.cspNonce}'`,
      'https://fonts.googleapis.com',
    ],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    frameSrc: ["'self'", 'https://accounts.google.com'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'self'"],
  };

  if (isProduction) {
    return {
      ...shared,
      connectSrc: [
        "'self'",
        'https://manager.headysystems.com',
        'https://api.anthropic.com',
        'https://api.openai.com',
        'https://*.headysystems.com',
        'https://*.headyme.com',
        'wss:',
      ],
    };
  }

  return {
    ...shared,
    styleSrc: [...shared.styleSrc, "'unsafe-inline'"],
    connectSrc: [
      ...new Set([
        "'self'",
        'https://manager.headysystems.com',
        'https://api.anthropic.com',
        'https://api.openai.com',
        'https://*.headysystems.com',
        'https://*.headyme.com',
        'wss:',
        'ws:',
        'http://localhost:*',
        'http://127.0.0.1:*',
      ]),
    ],
  };
}

function cspProfilesMiddleware(nodeEnv = process.env.NODE_ENV) {
  return [
    createNonce,
    helmet({
      contentSecurityPolicy: {
        directives: getCspDirectives(nodeEnv),
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
      xContentTypeOptions: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  ];
}

module.exports = {
  cspProfilesMiddleware,
  getCspDirectives,
};
