import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const outputPath = process.argv[2] ?? 'final-security-readiness.json';

const result = spawnSync('npm', ['run', 'security:final-readiness'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const stdout = result.stdout ?? '';
const stderr = result.stderr ?? '';
const exitCode = result.status ?? 1;

const report = {
  status: exitCode === 0 ? 'ok' : 'blocked',
  generatedAt: new Date().toISOString(),
  command: 'npm run security:final-readiness',
  exitCode,
  stdout: stdout.trim(),
  stderr: stderr.trim(),
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);
process.exitCode = exitCode;