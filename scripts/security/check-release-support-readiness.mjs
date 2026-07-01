import { readFileSync } from 'node:fs';

const checks = [];

function requireFile(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    checks.push(`Missing required file: ${path}`);
    return '';
  }
}

function requireIncludes(content, token, context) {
  if (!content.toLowerCase().includes(token.toLowerCase())) {
    checks.push(`${context} must include: ${token}`);
  }
}

function requireExactIncludes(content, token, context) {
  if (!content.includes(token)) {
    checks.push(`${context} must include exact token: ${token}`);
  }
}

const support = requireFile('docs/RELEASE_SUPPORT_READINESS.md');
const customerComms = requireFile('docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md');
const incident = requireFile('docs/RELEASE_INCIDENT_RESPONSE_PLAN.md');
const rollback = requireFile('docs/RELEASE_ROLLBACK_PLAN.md');
const approval = requireFile('docs/RELEASE_APPROVAL_RECORD.md');
const evidence = requireFile('docs/RELEASE_EVIDENCE_CHECKLIST.md');
const packageJson = requireFile('package.json');

[
  'Release Support Readiness',
  'Release owner',
  'Customer support owner',
  'Engineering escalation owner',
  'Security/compliance escalation owner',
  'Billing escalation owner',
  'Incident commander backup',
  'Customer communication owner',
  'Support P1',
  'Support P2',
  'Support P3',
  'Escalation matrix',
  'Evidence requirements',
  'Automatic No-Go conditions',
  'Conditional Go conditions',
  'Enterprise release rule',
].forEach((token) => requireIncludes(support, token, 'docs/RELEASE_SUPPORT_READINESS.md'));

[
  'customer communication owner',
  'status page',
  'support',
].forEach((token) => requireIncludes(customerComms, token, 'docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md'));

[
  'incident commander',
  'customer communication owner',
  'rollback owner',
].forEach((token) => requireIncludes(incident, token, 'docs/RELEASE_INCIDENT_RESPONSE_PLAN.md'));

[
  'rollback owner',
  'post-rollback validation',
].forEach((token) => requireIncludes(rollback, token, 'docs/RELEASE_ROLLBACK_PLAN.md'));

[
  'support',
  'approver',
  'exceptions',
].forEach((token) => requireIncludes(approval, token, 'docs/RELEASE_APPROVAL_RECORD.md'));

[
  'support readiness',
  'customer communication',
].forEach((token) => requireIncludes(evidence, token, 'docs/RELEASE_EVIDENCE_CHECKLIST.md'));

requireExactIncludes(packageJson, 'security:release-support-readiness', 'package.json');
requireExactIncludes(packageJson, 'release:readiness', 'package.json');

if (checks.length > 0) {
  console.error('Release support readiness failures:');
  for (const check of checks) {
    console.error(`- ${check}`);
  }
  process.exit(1);
}

console.log('Release support readiness: ok');
