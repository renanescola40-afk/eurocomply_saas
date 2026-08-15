import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/release-final-validation.yml', 'utf8');
const gitignore = readFileSync('.gitignore', 'utf8');

describe('release final validation artifact hygiene', () => {
  it('keeps generated validation output out of source control and uploads nested current-run output', () => {
    expect(gitignore.split(/\r?\n/)).toContain('release-validation/');
    expect(workflow).toContain('release-validation/**');
    expect(workflow).not.toContain('release-validation/summary.json');
    expect(workflow).not.toContain('release-validation/summary.md');
    expect(workflow).not.toContain('release-validation/logs/*.log');
  });

  it('purges output inherited from an assessed historical commit before current-run validation', () => {
    expect(workflow).toContain('rm -rf release-validation');
    expect(workflow).toContain('docs/security/evidence/runtime/enterprise-release-env-readiness.json');
    expect(workflow).toContain('docs/security/evidence/runtime/public-production-release-env-readiness.json');
    expect(workflow).toMatch(/git checkout --detach[\s\S]*rm -rf release-validation[\s\S]*Run final validation bundle/);
  });

  it('retains preflight failures and nested current-run validation output', () => {
    expect(workflow).toContain('assessed-commit.txt');
    expect(workflow).toContain('release-validation/**');
    expect(workflow).toContain('docs/security/evidence/runtime/enterprise-release-env-readiness.json');
    expect(workflow).toContain('docs/security/evidence/runtime/public-production-release-env-readiness.json');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('uses: actions/upload-artifact@v7');
  });

  it('binds both validation profiles to the canonical protected Production environment', () => {
    expect(workflow).toContain('environment: Production');
    expect(workflow).not.toContain('environment: ${{ inputs.release_target }}');
    expect(workflow).toContain('RELEASE_TARGET: ${{ inputs.release_target }}');
  });
});
