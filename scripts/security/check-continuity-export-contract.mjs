import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const routePath = join(root, 'src', 'app', 'api', 'continuity-center', 'export', 'route.ts');
const failures = [];

if (!existsSync(routePath)) {
  failures.push('continuity export route is missing.');
} else {
  const source = readFileSync(routePath, 'utf8');

  if (!source.includes('publicStepUpSummary(stepUp.assessment)')) {
    failures.push('continuity export must use the centralized public step-up summary.');
  }

  if (!source.includes('sanitizeDocumentDownloadFileName(')) {
    failures.push('continuity export must sanitize the download file name.');
  }

  if (!source.includes('noStoreDownload(')) {
    failures.push('continuity export must use the centralized no-store download helper.');
  }

  if (/return\s+NextResponse\.json\s*\(/.test(source)) {
    failures.push('continuity export must not return raw framework JSON responses directly.');
  }

  const payloadStart = source.indexOf('const payload =');
  const payloadEnd = source.indexOf('const integrity =');
  const payloadRegion = payloadStart >= 0 && payloadEnd > payloadStart ? source.slice(payloadStart, payloadEnd) : '';

  if (payloadRegion.includes('stepUp.assessment.')) {
    failures.push('continuity export payload must not embed internal step-up assessment fields.');
  }
}

console.log('Continuity export contract check');
console.log('--------------------------------');
console.log('Checked continuity JSON export response contract.');

if (failures.length > 0) {
  console.error('Continuity export contract failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Continuity export contract: ok');
}
