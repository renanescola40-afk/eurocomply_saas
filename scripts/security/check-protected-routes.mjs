import { existsSync, readFileSync } from 'node:fs';

const proxyPath = 'proxy.ts';
const deprecatedMiddlewarePath = 'middleware.ts';
const codeownersPath = 'CODEOWNERS';
const prTemplatePath = '.github/pull_request_template.md';
const threatModelPath = 'docs/security/THREAT_MODEL.md';
const exceptionRegisterPath = 'docs/security/SECURITY_EXCEPTION_REGISTER.md';
const gitleaksWorkflowPath = '.github/workflows/gitleaks.yml';
const gitleaksConfigPath = '.gitleaks.toml';
const fullSecuritySuitePath = '.github/workflows/full-security-suite.yml';
const semgrepWorkflowPath = '.github/workflows/semgrep.yml';
const actionlintWorkflowPath = '.github/workflows/actionlint.yml';
const p0LockfilePlanWorkflowPath = '.github/workflows/p0-lockfile-plan.yml';
const p0LockfileCommitWorkflowPath = '.github/workflows/p0-commit-lockfile.yml';
const p0RuntimeEvidenceWorkflowPath = '.github/workflows/p0-runtime-evidence.yml';
const p0BranchProtectionEvidenceWorkflowPath = '.github/workflows/p0-branch-protection-evidence.yml';
const p0ProgressWorkflowPath = '.github/workflows/p0-progress.yml';
const p0ProgressCommentWorkflowPath = '.github/workflows/p0-progress-comment.yml';
const p0RuntimeEvidenceSchemaPath = 'docs/security/evidence/p0-runtime-evidence.schema.json';
const p0RuntimeEvidenceExamplesPath = 'docs/security/evidence/p0-runtime-evidence.examples.md';
const p0RuntimeEvidenceTemplatesPath = 'docs/security/evidence/p0-runtime-evidence.templates.md';
const p0RuntimeEvidenceFilesCheckPath = 'scripts/security/check-p0-runtime-evidence-files.mjs';
const gitignorePath = '.gitignore';
const npmrcPath = '.npmrc';
const packageJsonPath = 'package.json';

const requiredProtectedSegments = [
  '/dashboard',
  '/settings',
  '/billing',
  '/team',
  '/profile',
  '/enterprise-readiness',
  '/security-center',
  '/security-questionnaire',
  '/retention-center',
  '/continuity-center',
  '/vendor-assurance',
  '/audit-pack',
  '/notificacoes',
  '/auditoria',
  '/risck-comply-home',
  '/riscos',
  '/documentos',
  '/raci',
  '/calendario-compliance',
  '/aprovacoes',
  '/ai-systems',
  '/ai-incidents',
];

const requiredSecurityTokens = [
  'assertSafeEnvironment',
  'createServerClient',
  'applySecurityHeaders',
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'frame-ancestors',
  'matchesSegment(pathname, protectedSegments)',
  'NextResponse.redirect',
];

const governanceChecks = [
  {
    path: codeownersPath,
    tokens: ['/src/app/api/', '/src/server/security/', '/supabase/', '/.github/', '/scripts/security/', '/package.json'],
  },
  {
    path: prTemplatePath,
    tokens: [
      'Security impact',
      'Resource identifiers are checked server-side',
      'Sensitive routes return no-store responses',
      'Inputs from requests, query strings or form data are schema validated before use',
      'Role, plan and organization authorization checks were reviewed',
    ],
  },
  {
    path: threatModelPath,
    tokens: ['Threat Model', 'Security objectives', 'Trust boundaries', 'High-priority threats', 'Release rule', 'Open risks'],
  },
  {
    path: exceptionRegisterPath,
    tokens: ['Security Exception Register', 'Automatic No-Go cases', 'Compensating control', 'Expiry date', 'Closure evidence'],
  },
  {
    path: gitleaksWorkflowPath,
    tokens: ['gitleaks/gitleaks-action@v2', 'fetch-depth: 0', 'persist-credentials: false', 'pull_request'],
  },
  {
    path: gitleaksConfigPath,
    tokens: ['RISCK COMPLY Gitleaks Configuration', 'risck-comply-public-env-sensitive-name', 'risck-comply-provider-key-like-value'],
  },
  {
    path: fullSecuritySuitePath,
    tokens: ['Full Security Suite', 'Run expanded security gates', 'check-api-endpoint-hardening.mjs', 'check-storage-security.mjs', 'check-enterprise-trust-evidence.mjs'],
  },
  {
    path: semgrepWorkflowPath,
    tokens: ['Semgrep', 'semgrep/semgrep', 'p/owasp-top-ten', 'p/typescript', 'p/javascript'],
  },
  {
    path: actionlintWorkflowPath,
    tokens: ['Actionlint', 'raven-actions/actionlint@v2', 'persist-credentials: false', 'pull_request'],
  },
  {
    path: p0LockfilePlanWorkflowPath,
    tokens: ['P0 Lockfile Plan', 'npm install --package-lock-only --ignore-scripts', 'p0-lockfile-artifacts.sha256', 'package.pinned.json'],
  },
  {
    path: p0LockfileCommitWorkflowPath,
    tokens: ['P0 Commit Lockfile', 'workflow_dispatch:', 'contents: write', 'npm install --package-lock-only --ignore-scripts', 'git add package-lock.json', 'security: commit deterministic npm lockfile'],
  },
  {
    path: p0RuntimeEvidenceWorkflowPath,
    tokens: ['P0 Runtime Evidence', 'check-p0-runtime-evidence-register.mjs', 'check-p0-runtime-evidence-files.mjs', 'persist-credentials: false'],
  },
  {
    path: p0BranchProtectionEvidenceWorkflowPath,
    tokens: ['P0 Branch Protection Evidence', 'workflow_dispatch:', 'contents: read', 'repos.getBranchProtection', 'branch-protection-main.generated.json', 'p0-branch-protection-evidence'],
  },
  {
    path: p0RuntimeEvidenceSchemaPath,
    tokens: ['RISCK COMPLY P0 Runtime Evidence', 'branch-protection-main', 'required-status-checks', 'production-secrets-provider-stores', 'supabase-live-rls-validation', 'external-security-review-or-pentest', 'redactionConfirmation'],
  },
  {
    path: p0RuntimeEvidenceExamplesPath,
    tokens: ['P0 Runtime Evidence Examples', 'branch-protection-main', 'required-status-checks', 'production-secrets-provider-stores', 'supabase-live-rls-validation', 'external-security-review-or-pentest'],
  },
  {
    path: p0RuntimeEvidenceTemplatesPath,
    tokens: ['P0 Runtime Evidence JSON Templates', 'Branch protection applied on `main`', 'Required status checks configured', 'Production secrets configured in provider secret stores', 'Supabase live RLS validation completed', 'External security review or pentest completed', 'Formal private-beta exception'],
  },
  {
    path: p0RuntimeEvidenceFilesCheckPath,
    tokens: ['docs/security/evidence/runtime', 'allowedItems', 'redactionConfirmation', 'controlsVerified', 'status Exception requires exception object'],
  },
  {
    path: p0ProgressWorkflowPath,
    tokens: ['P0 Progress', 'write-p0-enterprise-progress.mjs', 'p0-enterprise-progress.json', 'Show runner Node.js and npm versions'],
  },
  {
    path: p0ProgressCommentWorkflowPath,
    tokens: ['P0 Progress Issue Comment', 'workflow_dispatch:', 'issues: write', 'write-p0-progress-comment.mjs', 'issue_number: 76'],
  },
  {
    path: gitignorePath,
    tokens: ['.env*', '!.env.example', '.vercel', 'security-endpoints-inventory.json', 'npm-audit*.json'],
  },
  {
    path: npmrcPath,
    tokens: ['package-lock=true', 'audit=true', 'fund=false', 'save-exact=true'],
  },
  {
    path: packageJsonPath,
    tokens: ['"packageManager": "npm@10.8.2"', '"security:public-secrets"', '"security:supply-chain"', '"security:protected-routes"', '"security:api-guards"'],
  },
];

const failures = [];

console.log('RISCK COMPLY protected route and release governance check');
console.log('----------------------------------------------------------');

if (!existsSync(proxyPath)) {
  failures.push('proxy.ts is missing. Next 16 proxy-based route protection is required.');
}

if (existsSync(deprecatedMiddlewarePath)) {
  failures.push('middleware.ts exists. Use proxy.ts only to avoid deprecated middleware convention drift.');
}

if (existsSync(proxyPath)) {
  const source = readFileSync(proxyPath, 'utf8');

  for (const segment of requiredProtectedSegments) {
    if (!source.includes(`'${segment}'`) && !source.includes(`"${segment}"`)) {
      failures.push(`Missing protected route segment in proxy.ts: ${segment}`);
    }
  }

  for (const token of requiredSecurityTokens) {
    if (!source.includes(token)) {
      failures.push(`proxy.ts missing required security token: ${token}`);
    }
  }

  const hasApiBypass = source.includes("pathname.startsWith('/api')") || source.includes('pathname.startsWith("/api")');
  if (!hasApiBypass) {
    failures.push('proxy.ts should explicitly bypass /api routes; API routes must enforce their own server-side guards.');
  }
}

for (const check of governanceChecks) {
  if (!existsSync(check.path)) {
    failures.push(`${check.path} is missing. Release governance evidence is required.`);
    continue;
  }

  const source = readFileSync(check.path, 'utf8');
  for (const token of check.tokens) {
    if (!source.includes(token)) {
      failures.push(`${check.path} missing required governance token: ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Protected route/governance failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Protected routes and release governance: ok');
}
