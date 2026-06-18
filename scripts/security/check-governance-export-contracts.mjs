import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const targets = [
  'src/app/api/vendor-assurance/export/route.ts',
  'src/app/api/retention-center/export/route.ts',
  'src/app/api/security-questionnaire/export/route.ts',
];

const requiredTokens = [
  'publicStepUpSummary(stepUp.assessment)',
  'noStoreDownload',
  'noStoreJson',
  'sanitizeDocumentDownloadFileName',
  "'X-Content-Type-Options': 'nosniff'",
];

const forbiddenTokens = [
  "import { NextResponse } from 'next/server'",
  'new NextResponse(',
  'NextResponse.json(',
  'function safeFilenamePart',
  "'Cache-Control': 'no-store'",
];

const failures = [];

for (const target of targets) {
  const filePath = join(root, target);
  if (!existsSync(filePath)) {
    failures.push(`${target}: missing export route; update this gate if the route was intentionally moved`);
    continue;
  }

  const source = readFileSync(filePath, 'utf8');

  for (const token of requiredTokens) {
    if (!source.includes(token)) {
      failures.push(`${target}: missing required governance export hardening token: ${token}`);
    }
  }

  for (const token of forbiddenTokens) {
    if (source.includes(token)) {
      failures.push(`${target}: forbidden legacy export response pattern remains: ${token}`);
    }
  }

  const payloadStart = source.indexOf('const payload = {');
  const integrityStart = source.indexOf('const integrity = buildEvidencePackIntegrity(payload);');
  const payloadRegion = payloadStart >= 0 && integrityStart > payloadStart
    ? source.slice(payloadStart, integrityStart)
    : '';

  if (!payloadRegion) {
    failures.push(`${target}: could not locate export payload region`);
  } else if (payloadRegion.includes('stepUp.assessment') && !payloadRegion.includes('publicStepUpSummary(stepUp.assessment)')) {
    failures.push(`${target}: export payload must use public step-up summary only`);
  }
}

if (failures.length > 0) {
  console.error('Governance export contract check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Governance export contracts are hardened.');
