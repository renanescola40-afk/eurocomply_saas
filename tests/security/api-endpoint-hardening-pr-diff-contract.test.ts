import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const scriptPath = join(process.cwd(), 'scripts/security/check-api-endpoint-hardening.mjs');
const source = readFileSync(scriptPath, 'utf8');

describe('API endpoint hardening pull request diff contract', () => {
  it('uses the pull request base instead of inspecting only the last commit', () => {
    expect(source).toContain('GITHUB_BASE_SHA');
    expect(source).toContain('GITHUB_BASE_REF');
    expect(source).toContain("execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`]");
    expect(source).not.toContain("git diff --name-only HEAD^ HEAD");
  });

  it('fails safe to a full endpoint scan when the pull request base cannot be resolved', () => {
    expect(source).toContain('falling back to a full API endpoint scan');
    expect(source).toMatch(/console\.warn\([\s\S]*?return null;/);
  });
});
