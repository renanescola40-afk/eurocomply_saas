import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'src/server/ai-governance/article-50-effective-dates.ts',
  'src/server/ai-governance/article-50-effective-dates.test.ts',
  'src/server/ai-governance/article-50-control-plane.ts',
  'src/server/ai-governance/article-50-control-plane.test.ts',
  'src/server/queries/article-50-workspace.ts',
  'src/app/api/ai-governance/article-50/route.ts',
  'src/components/ai-governance/article-50-workspace.tsx',
  'src/app/[locale]/dashboard/transparencia/page.tsx',
  'src/lib/article-50-deadlines.ts',
  'supabase/migrations/20260803133000_article_50_product_integration.sql',
  'supabase/migrations/20260803133100_article_50_claim_evidence_constraints.sql',
  'tests/article-50-operational-api-contract.test.ts',
  'tests/article-50-operational-migration-contract.test.ts',
  'tests/article-50-operational-ui-contract.test.ts',
  'docs/compliance/ARTICLE_50_OPERATIONAL_CONTROL_PLANE.md',
  'docs/compliance/evidence/review-packets/article-50-qualified-review-packet.json',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length > 0) {
  console.error(`Article 50 gate failed. Missing: ${missing.join(', ')}`);
  process.exit(1);
}

const resolver = fs.readFileSync('src/server/ai-governance/article-50-effective-dates.ts', 'utf8');
const controlPlane = fs.readFileSync('src/server/ai-governance/article-50-control-plane.ts', 'utf8');
const route = fs.readFileSync('src/app/api/ai-governance/article-50/route.ts', 'utf8');
const queries = fs.readFileSync('src/server/queries/article-50-workspace.ts', 'utf8');
const workspace = fs.readFileSync('src/components/ai-governance/article-50-workspace.tsx', 'utf8');
const page = fs.readFileSync('src/app/[locale]/dashboard/transparencia/page.tsx', 'utf8');
const migration = [
  'supabase/migrations/20260803133000_article_50_product_integration.sql',
  'supabase/migrations/20260803133100_article_50_claim_evidence_constraints.sql',
].map((file) => fs.readFileSync(file, 'utf8')).join('\n');

const forbiddenClaims = [
  /fully compliant/i,
  /guaranteed compliance/i,
  /regulator approved/i,
  /automatic(?:ally)? avoids fines/i,
];

for (const [name, content] of [
  ['resolver', resolver],
  ['controlPlane', controlPlane],
  ['route', route],
  ['queries', queries],
  ['workspace', workspace],
]) {
  for (const claim of forbiddenClaims) {
    if (claim.test(content)) {
      console.error(`Article 50 gate failed: forbidden claim in ${name}: ${claim}`);
      process.exit(1);
    }
  }
}

const sharedInvariants = [
  "const ARTICLE_50_BASE_DATE = '2026-08-02'",
  "input.obligation === 'article_50_4_deployer_disclosure'",
  'finalAmendingActVerifiedInOfficialJournal',
  'Official Journal verification is claimed without a retained evidence identifier.',
];
for (const invariant of sharedInvariants) {
  if (!resolver.includes(invariant) && !controlPlane.includes(invariant)) {
    console.error(`Article 50 gate failed: missing legal invariant: ${invariant}`);
    process.exit(1);
  }
}

const routeInvariants = [
  'requireApiUser()',
  'getCurrentOrganizationForUser(user.id)',
  "permission: 'read_ai_governance'",
  "permission: 'manage_ai_governance'",
  'assertTrustedOrigin(request)',
  'checkDistributedRateLimit',
  'parseJsonBodyWithZod',
  'createAuditEvent',
  'rollbackArticle50Assessment',
  'rollbackArticle50Evidence',
];
for (const invariant of routeInvariants) {
  if (!route.includes(invariant)) {
    console.error(`Article 50 gate failed: missing API invariant: ${invariant}`);
    process.exit(1);
  }
}

if (page.includes('localStorage') || page.includes('supabase')) {
  console.error('Article 50 gate failed: dashboard page restored browser-local or direct Supabase persistence.');
  process.exit(1);
}
if (workspace.includes('localStorage') || workspace.includes("@/integrations/supabase/client")) {
  console.error('Article 50 gate failed: workspace bypasses the protected server API.');
  process.exit(1);
}
if (!workspace.includes('/api/ai-governance/article-50')) {
  console.error('Article 50 gate failed: workspace does not consume the protected API.');
  process.exit(1);
}

for (const table of [
  'ai_article50_assessments',
  'ai_article50_evidence',
  'ai_article50_events',
]) {
  if (!migration.includes(`alter table public.${table} enable row level security`)) {
    console.error(`Article 50 gate failed: RLS is not enabled for ${table}.`);
    process.exit(1);
  }
  if (!migration.includes(`alter table public.${table} force row level security`)) {
    console.error(`Article 50 gate failed: RLS is not forced for ${table}.`);
    process.exit(1);
  }
}

const migrationInvariants = [
  'pg_advisory_xact_lock',
  'to service_role',
  'ai_article50_marking_claim_requires_evidence',
  'ai_article50_disclosure_claim_requires_evidence',
  'foreign key (assessment_id, organization_id)',
  'references public.ai_article50_assessments(id, organization_id)',
];
for (const invariant of migrationInvariants) {
  if (!migration.includes(invariant)) {
    console.error(`Article 50 gate failed: missing migration invariant: ${invariant}`);
    process.exit(1);
  }
}

if (!queries.includes(".eq('organization_id', organizationId)")) {
  console.error('Article 50 gate failed: query layer lost explicit organization scoping.');
  process.exit(1);
}
if (!queries.includes(".contains('payload', { evidenceId })")) {
  console.error('Article 50 gate failed: evidence rollback leaves an internal event orphaned.');
  process.exit(1);
}

console.log('Article 50 operational product-integration gate passed.');
