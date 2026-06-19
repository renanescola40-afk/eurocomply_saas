#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

console.log('EuroComply step-up runtime provider preflight');
console.log('------------------------------------------------');
console.log('Running the enterprise release gate with runtime provider checks enabled.');
console.log('Values are never printed; the underlying gate only reports configured/missing failures.');

const result = spawnSync(process.execPath, ['scripts/security/check-step-up.mjs'], {
  env: {
    ...process.env,
    EUROCOMPLY_ENTERPRISE_RELEASE: 'true',
  },
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exitCode = result.status;
} else if (result.error) {
  console.error(`Step-up runtime preflight could not execute: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = 1;
}
