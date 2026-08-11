import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const standalone = readFileSync('.github/workflows/codeql.yml', 'utf8');
const fullSuite = readFileSync('.github/workflows/full-security-suite.yml', 'utf8');

for (const [name, workflow] of [
  ['CodeQL', standalone],
  ['Full Security Suite', fullSuite],
]) {
  test(`${name} keeps supported CodeQL upload semantics on pull requests`, () => {
    assert.match(workflow, /security-events:\s*write/);
    assert.match(workflow, /github\/codeql-action\/analyze@/);
    assert.match(workflow, /output:\s*codeql-results/);
    assert.match(workflow, /upload:\s*always/);
    assert.doesNotMatch(workflow, /upload:\s*\$\{\{[^\n]*pull_request[^\n]*never/);
  });

  test(`${name} preserves SARIF as a reviewable pull-request artifact`, () => {
    assert.match(workflow, /Preserve CodeQL SARIF for pull requests/);
    assert.match(workflow, /if:\s*github\.event_name == 'pull_request'/);
    assert.match(workflow, /actions\/upload-artifact@/);
    assert.match(workflow, /path:\s*codeql-results/);
  });
}

// Regression boundary: CodeQL Action v4 performs SARIF post-processing even when
// upload is disabled. This repository therefore keeps analyze upload enabled and
// retains a second reviewable SARIF artifact instead of using `upload: never`.
