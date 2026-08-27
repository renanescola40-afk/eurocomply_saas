import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('API handler guard invocations', () => {
  it('rejects lexical guard names and requires reachable guard calls per exported handler', () => {
    expect(() => execFileSync(
      process.execPath,
      [join(ROOT, 'scripts/security/check-api-handler-guard-invocations.mjs')],
      {
        cwd: ROOT,
        stdio: 'pipe',
      },
    )).not.toThrow();
  }, 30_000);
});
