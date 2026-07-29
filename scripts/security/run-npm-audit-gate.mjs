import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { evaluateNpmAudit } from './npm-audit-policy.mjs';

const result = spawnSync('npm', ['audit', '--audit-level=moderate', '--json'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

if (result.error || ![0, 1].includes(result.status)) {
  console.error('npm audit could not complete');
  if (result.error) console.error(result.error.message);
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

let audit;
let lockfile;
try {
  audit = JSON.parse(result.stdout);
  lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8'));
} catch (error) {
  console.error(`npm audit gate could not parse evidence: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const evaluation = evaluateNpmAudit({ audit, lockfile });

if (!evaluation.ok) {
  console.error('npm audit gate failures:');
  for (const failure of evaluation.failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (evaluation.appliedExceptions.length > 0) {
  console.warn('npm audit gate passed with temporary scanner-metadata exceptions:');
  for (const exception of evaluation.appliedExceptions) {
    console.warn(
      `- ${exception.id}: ${exception.packageName}@${exception.version}, expires ${exception.expiresAt}`,
    );
  }
} else {
  console.log('npm audit gate: no vulnerabilities at moderate severity or higher');
}
