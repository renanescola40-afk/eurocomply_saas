import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const finalRunner = readFileSync(
  join(process.cwd(), 'scripts/release/run-public-production-release-v2.mjs'),
  'utf8',
);

describe('production final rollback target aliases', () => {
  it('accepts the canonical rollback URL alias without weakening fail-closed metadata checks', () => {
    expect(finalRunner).toContain('process.env.RELEASE_ROLLBACK_TARGET_URL');
    expect(finalRunner).toContain("metadataFailures.push('Missing rollback target.')");
    expect(finalRunner).toMatch(
      /!process\.env\.RELEASE_ROLLBACK_TARGET\s*&&\s*!process\.env\.RELEASE_ROLLBACK_TARGET_URL\s*&&\s*!process\.env\.LAST_KNOWN_GOOD_DEPLOYMENT_URL/,
    );
  });
});
