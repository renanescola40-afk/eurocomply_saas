import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  'security:package-lock',
  'security:npm-audit:all',
  'security:public-secrets',
  'security:production-secrets',
  'security:supply-chain',
  'security:ci-cd',
  'security:rls:advisory',
  'security:step-up',
  'security:client-boundaries',
  'security:auth-tokens',
  'security:authorization-bola',
  'security:server-action-identity',
  'security:protected-routes',
  'security:headers',
  'security:no-store',
  'security:origin-guards',
  'security:no-open-proxy',
  'security:internal-maintenance',
  'security:ops-readiness',
  'security:public-verifiers',
  'security:public-errors',
  'security:csv-exports',
  'security:document-filenames',
  'security:upload',
  'security:upload-content-scan',
  'security:upload-scanner:ci',
  'security:billing-webhook-body',
  'security:responses',
  'security:logs',
  'security:api-endpoints',
  'security:api-guards',
  'security:enterprise-api',
  'security:public-claims',
];

const startedAt = new Date();
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

function appendSummary(markdown) {
  if (!summaryPath) {
    return;
  }
  appendFileSync(summaryPath, `${markdown}\n`, 'utf8');
}

appendSummary('## SECURITY_CI diagnostic gate');
appendSummary('');
appendSummary('| # | Subcheck | Status |');
appendSummary('|---:|---|---|');

for (const [index, check] of checks.entries()) {
  const number = index + 1;
  const command = `npm run ${check}`;

  console.log(`::group::SECURITY_CI_SUBCHECK ${number}/${checks.length} ${check}`);
  console.log(`SECURITY_CI_SUBCHECK=${check}`);
  console.log(`SECURITY_CI_COMMAND=${command}`);

  const result = spawnSync('npm', ['run', check], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SECURITY_CI_ACTIVE_CHECK: check,
    },
    shell: false,
    stdio: 'inherit',
  });

  const exitCode = typeof result.status === 'number' ? result.status : 1;
  const signal = result.signal ?? '';

  console.log(`SECURITY_CI_EXIT_CODE=${exitCode}`);
  if (signal) {
    console.log(`SECURITY_CI_SIGNAL=${signal}`);
  }
  console.log('::endgroup::');

  if (exitCode !== 0) {
    const signalSuffix = signal ? ` signal=${signal}` : '';
    const message = `${check} failed with exit code ${exitCode}${signalSuffix}`;

    console.error(`::error title=SECURITY_CI_SUBCHECK_FAILED::${message}`);
    console.error(`SECURITY_CI_FAILED_CHECK=${check}`);
    console.error(`SECURITY_CI_FAILED_COMMAND=${command}`);

    appendSummary(`| ${number} | \`${check}\` | ❌ FAILED, exit ${exitCode}${signalSuffix} |`);
    appendSummary('');
    appendSummary(`**SECURITY_CI_FAILED_CHECK:** \`${check}\``);
    appendSummary(`**SECURITY_CI_FAILED_COMMAND:** \`${command}\``);
    appendSummary(`**SECURITY_CI_STARTED_AT:** \`${startedAt.toISOString()}\``);
    appendSummary(`**SECURITY_CI_FAILED_AT:** \`${new Date().toISOString()}\``);

    process.exit(exitCode);
  }

  appendSummary(`| ${number} | \`${check}\` | ✅ PASS |`);
}

appendSummary('');
appendSummary('**SECURITY_CI:** `PASS`');
appendSummary(`**SECURITY_CI_STARTED_AT:** \`${startedAt.toISOString()}\``);
appendSummary(`**SECURITY_CI_FINISHED_AT:** \`${new Date().toISOString()}\``);

console.log('SECURITY_CI=PASS');
