const publicEnv = (name: string) => `NEXT_PUBLIC_${name}`;

const FORBIDDEN_PUBLIC_ENV_KEYS = [
  publicEnv('SUPABASE_SERVICE_ROLE_KEY'),
  publicEnv('STRIPE_SECRET_KEY'),
  publicEnv('OPENAI_API_KEY'),
  publicEnv('RESEND_API_KEY'),
  publicEnv('GITHUB_TOKEN'),
  publicEnv('VERCEL_TOKEN'),
  publicEnv('GOOGLE_CLIENT_SECRET'),
  publicEnv('LINKEDIN_ACCESS_TOKEN'),
  publicEnv('LINKEDIN_CLIENT_SECRET'),
] as const;

const SECRET_VALUE_PATTERNS = [
  { name: 'Supabase service role JWT', pattern: /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/ },
  { name: 'Stripe secret key', pattern: /^sk_(live|test)_/ },
  { name: 'OpenAI API key', pattern: /^sk-[a-zA-Z0-9]/ },
  { name: 'GitHub token', pattern: /^(ghp_|github_pat_)/ },
  { name: 'Vercel token', pattern: /^[A-Za-z0-9]{24,}$/ },
];

let hasCheckedEnvironment = false;

function maskKey(key: string) {
  if (key.length <= 8) return '***';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function findForbiddenPublicSecrets() {
  const directLeaks = FORBIDDEN_PUBLIC_ENV_KEYS.filter((key) => Boolean(process.env[key]));

  const patternLeaks = Object.entries(process.env)
    .filter(([key, value]) => key.startsWith('NEXT_PUBLIC_') && Boolean(value))
    .flatMap(([key, value]) => {
      const matched = SECRET_VALUE_PATTERNS.find((candidate) => candidate.pattern.test(String(value)));
      return matched ? [{ key, type: matched.name }] : [];
    });

  return { directLeaks, patternLeaks };
}

export function assertSafeEnvironment() {
  if (hasCheckedEnvironment) return;
  hasCheckedEnvironment = true;

  const { directLeaks, patternLeaks } = findForbiddenPublicSecrets();

  if (directLeaks.length === 0 && patternLeaks.length === 0) return;

  const directMessage = directLeaks.length > 0
    ? `Forbidden public secret env keys: ${directLeaks.join(', ')}`
    : '';
  const patternMessage = patternLeaks.length > 0
    ? `Public env values look like secrets: ${patternLeaks.map((item) => `${item.key} (${item.type})`).join(', ')}`
    : '';

  throw new Error([
    'Unsafe environment configuration detected.',
    directMessage,
    patternMessage,
    'Move secrets to non-NEXT_PUBLIC variables and rotate any exposed keys immediately.',
  ].filter(Boolean).join(' '));
}

export function getRedactedEnvironmentSnapshot() {
  return Object.fromEntries(
    Object.entries(process.env)
      .filter(([key]) => key.includes('SUPABASE') || key.includes('STRIPE') || key.includes('OPENAI') || key.includes('RESEND') || key.includes('GITHUB') || key.includes('VERCEL') || key.includes('LINKEDIN'))
      .map(([key, value]) => [key, value ? maskKey(String(value)) : null]),
  );
}
