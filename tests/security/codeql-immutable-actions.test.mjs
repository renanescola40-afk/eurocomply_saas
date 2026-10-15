import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const standalone = readFileSync('.github/workflows/codeql.yml', 'utf8');
const suite = readFileSync('.github/workflows/full-security-suite.yml', 'utf8');
const stages = ['init', 'autobuild', 'analyze'];

function stageSha(source, stage) {
  const pattern = new RegExp('github/codeql-action/' + stage + '@([a-f0-9]{40})', 'g');
  const matches = [...source.matchAll(pattern)].map(m => m[1]);
  assert.equal(matches.length, 1, 'expected one pinned ' + stage);
  return matches[0];
}

test('standalone CodeQL uses a single immutable action commit for all three stages', () => {
  const shas = stages.map(stage => stageSha(standalone, stage));
  assert.equal(new Set(shas).size, 1, 'mixed action versions can break autobuild');
  assert.doesNotMatch(standalone, /github\/codeql-action\/(?:init|autobuild|analyze)@v\d+/);
});

test('standalone and Full Security Suite use the same CodeQL commit', () => {
  for (const stage of stages) assert.equal(stageSha(standalone, stage), stageSha(suite, stage));
});

test('standalone CodeQL checkout is pinned and avoids persisting credentials', () => {
  assert.match(standalone, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(standalone, /persist-credentials: false/);
});

test('CodeQL remains a required fail-closed scan and SARIF upload; no bypass added', () => {
  assert.match(standalone, /security-events: write/);
  assert.match(standalone, /upload: always/);
  assert.doesNotMatch(standalone, /continue-on-error: true/);
});
