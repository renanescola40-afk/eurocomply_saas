import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const generator = readFileSync('scripts/security/run-production-provider-runtime-proof.mjs', 'utf8');
const checker = readFileSync('scripts/security/check-p0-runtime-evidence-files.mjs', 'utf8');

test('provider runtime canonical redaction confirmation is accepted by the P0 evidence checker', () => {
  const match = generator.match(/const CANONICAL_REDACTION_CONFIRMATION = '([^']+)'/);
  expect(match, 'canonical provider redaction confirmation must be declared').not.toBeNull();
  expect(checker).toContain(`'${match?.[1]}'`);
});
