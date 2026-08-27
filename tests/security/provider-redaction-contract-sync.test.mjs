import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const generator = readFileSync('scripts/security/run-production-provider-runtime-proof.mjs', 'utf8');
const checker = readFileSync('scripts/security/check-p0-runtime-evidence-files.mjs', 'utf8');

test('provider runtime canonical redaction confirmation is accepted by the P0 evidence checker', () => {
  const match = generator.match(/const CANONICAL_REDACTION_CONFIRMATION = '([^']+)'/);
  assert.ok(match, 'canonical provider redaction confirmation must be declared');
  assert.ok(checker.includes(`'${match[1]}'`), 'checker allowlist must accept the canonical provider redaction confirmation');
});
