import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const checksumPath = 'p0-lockfile-artifacts.sha256';
const failures = [];

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

if (!existsSync(checksumPath)) {
  console.error(`${checksumPath} is missing. Download the full p0-lockfile-plan artifact first.`);
  process.exit(1);
}

const lines = readFileSync(checksumPath, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

for (const line of lines) {
  const [expected, ...rest] = line.split(/\s+/);
  const file = rest.join(' ').trim();

  if (!expected || !file) {
    failures.push(`Invalid checksum line: ${line}`);
    continue;
  }

  if (!existsSync(file)) {
    failures.push(`${file} is missing from the artifact directory`);
    continue;
  }

  const actual = sha256(file);
  if (actual !== expected) {
    failures.push(`${file} checksum mismatch: expected ${expected}, got ${actual}`);
  }
}

console.log('EuroComply P0 lockfile artifact checksum verification');
console.log('------------------------------------------------------');
console.log(`Verified entries: ${lines.length}`);

if (failures.length > 0) {
  console.error('P0 artifact checksum verification failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('P0 lockfile artifacts: checksums ok');
}
