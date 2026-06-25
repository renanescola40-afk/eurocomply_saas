process.env[['STRICT', 'PUBLIC', 'SECRET', 'SCAN'].join('_')] = '1';
await import('./check-public-secrets.mjs');
