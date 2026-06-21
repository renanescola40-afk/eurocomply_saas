import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const root = process.cwd();
const apiRoot = join(root, 'src', 'app', 'api');
const reportPath = join(root, 'security-endpoints-inventory.json');
const ignoredDirectories = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);
const providerWebhookSecretToken = ['STRIPE', 'WEBHOOK', 'SECRET'].join('_');

const publicEndpointAllowlist = [
  { pattern: /src\/app\/api\/billing\/webhook\/route\.ts$/, reason: 'Stripe webhook validates provider signature instead of user session' },
  { pattern: /src\/app\/api\/audit\/evidence-pack\/verify\/route\.ts$/, reason: 'Public verifier; must remain no-store/rate-limited' },
  { pattern: /src\/app\/api\/ops\/.*\/route\.ts$/, reason: 'Ops routes use HEALTHCHECK_TOKEN/cron secret instead of user session' },
];

const authTokens = [
  'getCurrentUser',
  'requireCurrentUser',
  'requireApiUser',
  'requireOrganizationContext',
  'supabase.auth.getUser',
  'HEALTHCHECK_TOKEN',
  'CRON_SECRET',
  'INTERNAL_CRON_SECRET',
  'constructEvent',
  providerWebhookSecretToken,
];

const schemaValidationTokens = [
  '.parse(',
  '.safeParse(',
  'z.object',
  'zod',
  'validate',
  'schema',
  'FormData',
  'readBoundedJsonRequest',
  'readBoundedStripeWebhookBody',
  'readBoundedBillingWebhookBody',
];

const clientInputTokens = [
  'request.json(',
  'request.formData(',
  'request.text(',
  'request.blob(',
  'searchParams.get',
  'new URL(request.url)',
];

const rateLimitTokens = [
  'checkDistributedRateLimit',
  'rateLimit',
  'rate-limit',
  'Retry-After',
  'requireTrustedMutation',
];

const criticalEndpointPatterns = [
  /\/login\//,
  /\/signup\//,
  /\/auth\//,
  /\/billing\//,
  /\/documents\//,
  /\/team\//,
  /\/audit\//,
  /\/security-questionnaire\//,
  /\/vendor-assurance\//,
  /\/enterprise-readiness\//,
  /\/ai-systems\//,
  /\/ai-incidents\//,
];

const unsafeCorsPatterns = [
  /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"]/, 
  /headers\.set\(['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]\)/,
  /cors\([^)]*origin\s*:\s*['"]\*['"]/, 
];

function changedApiRoutes() {
  if (process.env.API_ENDPOINT_HARDENING_FULL_SCAN === '1') return null;
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') return null;

  try {
    const changed = execSync('git diff --name-only HEAD^ HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return changed.filter((file) => /^src\/app\/api\/.*\/route\.(ts|js)$/.test(file));
  } catch {
    return null;
  }
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return walk(fullPath);
    }
    if (entry.isFile() && /^route\.(ts|js)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function normalizePath(path) {
  return relative(root, path).split(sep).join('/');
}

function exportedMethods(source) {
  return [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g)].map((match) => match[1]);
}

function hasAny(source, tokens) {
  return tokens.some((token) => (typeof token === 'string' ? source.includes(token) : token.test(source)));
}

function allowlistReason(path) {
  return publicEndpointAllowlist.find((entry) => entry.pattern.test(path))?.reason ?? null;
}

function hasClientInput(source) {
  return hasAny(source, clientInputTokens);
}

function isCriticalEndpoint(path) {
  return criticalEndpointPatterns.some((pattern) => pattern.test(path));
}

const changedRoutes = changedApiRoutes();
const allRoutes = walk(apiRoot);
const routes = Array.isArray(changedRoutes)
  ? allRoutes.filter((route) => changedRoutes.includes(normalizePath(route)))
  : allRoutes;
const failures = [];
const inventory = [];

for (const route of routes) {
  const normalized = normalizePath(route);
  const source = readFileSync(route, 'utf8');
  const methods = exportedMethods(source);
  const publicReason = allowlistReason(normalized);
  const authenticated = hasAny(source, authTokens);
  const receivesClientInput = hasClientInput(source);
  const validatesSchema = hasAny(source, schemaValidationTokens);
  const rateLimited = hasAny(source, rateLimitTokens);
  const critical = isCriticalEndpoint(normalized) || receivesClientInput || methods.some((method) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method));
  const hasUnsafeCors = unsafeCorsPatterns.some((pattern) => pattern.test(source));

  inventory.push({
    path: normalized,
    methods,
    public: Boolean(publicReason),
    publicReason,
    authenticated,
    receivesClientInput,
    validatesSchema,
    rateLimited,
    critical,
  });

  if (!publicReason && !authenticated) {
    failures.push(`${normalized}: endpoint is not allowlisted public and does not prove authentication/token verification`);
  }

  if (receivesClientInput && !validatesSchema) {
    failures.push(`${normalized}: receives client input but does not prove schema validation; use Zod safeParse/parse before using values`);
  }

  if (critical && !rateLimited) {
    failures.push(`${normalized}: critical or mutating endpoint does not prove per-IP/user rate limiting`);
  }

  if (hasUnsafeCors) {
    failures.push(`${normalized}: CORS allows wildcard origin; restrict Access-Control-Allow-Origin to SaaS domains in production`);
  }
}

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify({ generatedBy: 'check-api-endpoint-hardening', scannedChangedApiRoutesOnly: Array.isArray(changedRoutes), endpoints: inventory }, null, 2)}\n`);

console.log('EuroComply API endpoint hardening check');
console.log('---------------------------------------');
console.log(`Scanned ${routes.length} API route files.`);
if (Array.isArray(changedRoutes) && changedRoutes.length === 0) console.log('No changed API route files detected in this pull request; full endpoint scan is skipped for unrelated changes.');
console.log(`Wrote endpoint inventory to ${relative(root, reportPath).split(sep).join('/')}.`);

if (failures.length > 0) {
  console.error('API endpoint hardening failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('API endpoint hardening: ok');
}
