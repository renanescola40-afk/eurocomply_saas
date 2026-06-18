import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const routes = [
  'src/app/auth/google/route.ts',
  'src/app/auth/callback/route.ts',
];

const failures = [];

for (const route of routes) {
  const source = readFileSync(join(root, route), 'utf8');

  if (!source.includes('resolveAuthAppBaseUrl')) {
    failures.push(`${route}: must resolve redirects from the configured app base URL helper`);
  }

  if (/new URL\(\s*next\s*,\s*request\.url\s*\)/.test(source)) {
    failures.push(`${route}: must not build destination redirects from request.url`);
  }

  if (/\.origin\s*;\s*\n\s*const\s+callbackUrl\s*=/.test(source)) {
    failures.push(`${route}: OAuth callback URL must not be derived from request origin`);
  }

  if (!source.includes('auth_app_url_unavailable')) {
    failures.push(`${route}: must fail closed when the configured app base URL is unavailable`);
  }
}

if (failures.length > 0) {
  console.error('Auth redirect base URL security check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Auth redirect base URL security check passed.');
