import { execSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';

function changedApiRoutes() {
  if (process.env.API_GUARDS_FULL_SCAN === '1') return null;
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') return null;

  try {
    return execSync('git diff --name-only HEAD^ HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((line) => line.trim())
      .filter((file) => /^src\/app\/api\/.*\/route\.(ts|js)$/.test(file));
  } catch {
    return null;
  }
}

console.log('EuroComply API guard coverage check');
console.log('-----------------------------------');

const changedRoutes = changedApiRoutes();
if (Array.isArray(changedRoutes) && changedRoutes.length === 0) {
  console.log('No changed API route files detected in this pull request; skipping full API guard scan.');
  process.exit(0);
}

if (Array.isArray(changedRoutes)) {
  console.log(`Detected ${changedRoutes.length} changed API route file(s); running route hardening scanner.`);
} else {
  console.log('Running full API route hardening scanner.');
}

const hardening = spawnSync(process.execPath, [join(process.cwd(), 'scripts/security/check-api-route-hardening.mjs')], {
  stdio: 'inherit',
});

if (hardening.status !== 0) {
  process.exitCode = 1;
} else {
  console.log('API guard coverage: ok');
}
