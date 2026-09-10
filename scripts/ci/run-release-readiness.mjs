import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  'release:deployment-smoke',
  'release:observability-smoke',
  'release:rollback:dry-run',
  'security:release-candidate',
  'security:release-evidence',
  'security:release-approval',
  'security:release-go-no-go',
  'security:release-rollback',
  'security:release-incident-response',
  'security:release-post-incident',
  'security:release-support-readiness',
  'security:release-operations',
  'security:p0-runtime-gap',
];

const startedAt = new Date();
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

function appendSummary(markdown) {
  if (!summaryPath) {
    return;
  }
  appendFileSync(summaryPath, `${markdown}\n`, 'utf8');
}

appendSummary('## RELEASE_READINESS diagnostic gate');
appendSummary('');
appendSummary('| # | Subcheck | Status |');
appendSummary('|---:|---|---|');

for (const [index, check] of checks.entries()) {
  const number = index + 1;
  const command = `npm run ${check}`;

  console.log(`::group::RELEASE_READINESS_SUBCHECK ${number}/${checks.length} ${check}`);
  console.log(`RELEASE_READINESS_SUBCHECK=${check}`);
  console.log(`RELEASE_READINESS_COMMAND=${command}`);

  const result = spawnSync('npm', ['run', check], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RELEASE_READINESS_ACTIVE_CHECK: check,
    },
    shell: false,
    stdio: 'inherit',
  });

  const exitCode = typeof result.status === 'number' ? result.status : 1;
  const signal = result.signal ?? '';

  console.log(`RELEASE_READINESS_EXIT_CODE=${exitCode}`);
  if (signal) {
    console.log(`RELEASE_READINESS_SIGNAL=${signal}`);
  }
  console.log('::endgroup::');

  if (exitCode !== 0) {
    const signalSuffix = signal ? ` signal=${signal}` : '';
    const message = `${check} failed with exit code ${exitCode}${signalSuffix}`;

    console.error(`::error title=RELEASE_READINESS_SUBCHECK_FAILED::${message}`);
    console.error(`RELEASE_READINESS_FAILED_CHECK=${check}`);
    console.error(`RELEASE_READINESS_FAILED_COMMAND=${command}`);

    appendSummary(`| ${number} | \`${check}\` | ❌ FAILED, exit ${exitCode}${signalSuffix} |`);
    appendSummary('');
    appendSummary(`**RELEASE_READINESS_FAILED_CHECK:** \`${check}\``);
    appendSummary(`**RELEASE_READINESS_FAILED_COMMAND:** \`${command}\``);
    appendSummary(`**RELEASE_READINESS_STARTED_AT:** \`${startedAt.toISOString()}\``);
    appendSummary(`**RELEASE_READINESS_FAILED_AT:** \`${new Date().toISOString()}\``);

    process.exit(exitCode);
  }

  appendSummary(`| ${number} | \`${check}\` | ✅ PASS |`);
}

appendSummary('');
appendSummary('**RELEASE_READINESS:** `PASS`');
appendSummary(`**RELEASE_READINESS_STARTED_AT:** \`${startedAt.toISOString()}\``);
appendSummary(`**RELEASE_READINESS_FINISHED_AT:** \`${new Date().toISOString()}\``);

console.log('RELEASE_READINESS=PASS');
