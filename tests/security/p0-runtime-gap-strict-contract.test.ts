import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = join(process.cwd(), 'scripts/security/report-p0-runtime-evidence-gap.mjs');
const source = readFileSync(scriptPath, 'utf8');

describe('P0 runtime evidence strict-mode contract', () => {
  it('enforces strict mode whenever the caller explicitly requests it', () => {
    expect(source).toContain('const strict = requestedStrict;');
    expect(source).not.toContain('requestedStrict && (finalValidationInProgress');
    expect(source).not.toContain('requestedStrict && !strict');
  });

  it('keeps the non-strict reporting path available to callers that omit --strict', () => {
    expect(source).toContain("const requestedStrict = process.argv.includes('--strict');");
    expect(source).toContain('if (strict && missing.length > 0)');
  });
});
