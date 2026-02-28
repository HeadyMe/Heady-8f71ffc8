const { validateAllowedOrigins } = require('../../src/middleware/cors-config');

describe('validateAllowedOrigins', () => {
  test('throws when production has no configured origins', () => {
    expect(() => validateAllowedOrigins({ nodeEnv: 'production', allowedOrigins: [] })).toThrow(
      'ALLOWED_ORIGINS must be configured in production',
    );
  });

  test('allows empty origins outside production', () => {
    expect(validateAllowedOrigins({ nodeEnv: 'development', allowedOrigins: [] })).toEqual([]);
  });
});
