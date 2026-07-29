import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'src/server/ai-governance/article-50-effective-dates.ts',
  'src/server/ai-governance/article-50-effective-dates.test.ts',
  'src/server/ai-governance/article-50-control-plane.ts',
  'src/server/ai-governance/article-50-control-plane.test.ts',
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
const forbiddenClaims = [
  /fully compliant/i,
  /guaranteed compliance/i,
  /regulator approved/i,
  /automatic(?:ally)? avoids fines/i,
];

for (const [name, content] of [['resolver', resolver], ['controlPlane', controlPlane]]) {
  for (const claim of forbiddenClaims) {
    if (claim.test(content)) {
      console.error(`Article 50 gate failed: forbidden claim in ${name}: ${claim}`);
      process.exit(1);
    }
  }
}

const invariants = [
  "const ARTICLE_50_BASE_DATE = '2026-08-02'",
  "input.obligation === 'article_50_4_deployer_disclosure'",
  'finalAmendingActVerifiedInOfficialJournal',
  'Official Journal verification is claimed without a retained evidence identifier.',
];

for (const invariant of invariants) {
  if (!resolver.includes(invariant) && !controlPlane.includes(invariant)) {
    console.error(`Article 50 gate failed: missing invariant: ${invariant}`);
    process.exit(1);
  }
}

console.log('Article 50 operational control-plane gate passed.');
