import { readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/RELEASE_READINESS_SCORECARD.md',
  'docs/RELEASE_CANDIDATE_VALIDATION.md',
  'docs/RELEASE_EVIDENCE_CHECKLIST.md',
  'docs/RELEASE_APPROVAL_RECORD.md',
  'docs/RELEASE_GO_NO_GO_CHECKLIST.md',
  'docs/RELEASE_ROLLBACK_PLAN.md',
  'docs/RELEASE_INCIDENT_RESPONSE_PLAN.md',
  'docs/RELEASE_POST_INCIDENT_REVIEW.md',
  'docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md',
  'docs/RELEASE_SUPPORT_READINESS.md',
  'docs/RELEASE_OPERATIONS_INDEX.md',
];

const scorecardTokens = [
  'Release Readiness Scorecard',
  'Scoring model',
  'Required areas',
  'Readiness thresholds',
  'Automatic No-Go conditions',
  'Build and Security CI',
  'Supply-chain',
  'Supabase RLS',
  'Audit-chain',
  'Step-up auth',
  'Upload security',
  'Billing',
  'Observability',
  'Rollback',
  'Incident response',
  'Customer communication',
  'External review',
  'strictest result wins',
];

const failures = [];

function readRequiredFile(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    failures.push(`Missing required release readiness file: ${path}`);
    return '';
  }
}

for (const path of requiredFiles) {
  readRequiredFile(path);
}

const scorecard = readRequiredFile('docs/RELEASE_READINESS_SCORECARD.md');
for (const token of scorecardTokens) {
  if (!scorecard.includes(token)) {
    failures.push(`Release readiness scorecard is missing token: ${token}`);
  }
}

for (const path of requiredFiles.filter((path) => path !== 'docs/RELEASE_READINESS_SCORECARD.md')) {
  if (!scorecard.includes(path)) {
    failures.push(`Release readiness scorecard does not link required file: ${path}`);
  }
}

if (failures.length > 0) {
  console.error('Release readiness scorecard check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release readiness scorecard check passed.');
