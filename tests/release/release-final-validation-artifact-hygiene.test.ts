import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/release-final-validation.yml', 'utf8');
const gitignore = readFileSync('.gitignore', 'utf8');

const PINNED_UPLOAD_ARTIFACT = 'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a';

describe('release final validation artifact hygiene', () => {
  it('keeps generated validation output out of source control and uploads nested current-run output', () => {
    expect(gitignore.split(/\r?\n/)).toContain('release-validation/');
    expect(workflow).toContain('release-validation/**');
    expect(workflow).not.toContain('release-validation/summary.json');
    expect(workflow).not.toContain('release-validation/summary.md');
    expect(workflow).not.toContain('release-validation/logs/*.log');
  });

  it('purges stale output only after exact current main is proven', () => {
    expect(workflow).toContain('test "$ACTUAL_COMMIT" = "$GITHUB_SHA"');
    expect(workflow).toContain('test "$MAIN_COMMIT" = "$GITHUB_SHA"');
    expect(workflow).toContain('rm -rf release-validation');
    expect(workflow).toContain('docs/security/evidence/runtime/enterprise-release-env-readiness.json');
    expect(workflow).toContain('docs/security/evidence/runtime/public-production-release-env-readiness.json');
    expect(workflow).toMatch(/Verify exact current main checkout[\s\S]*rm -rf release-validation[\s\S]*Run final validation bundle/);
    expect(workflow).not.toContain('git checkout --detach "$RESOLVED_COMMIT"');
  });

  it('retains preflight failures and nested current-run validation output', () => {
    expect(workflow).toContain('assessed-commit.txt');
    expect(workflow).toContain('release-validation/**');
    expect(workflow).toContain('docs/security/evidence/runtime/enterprise-release-env-readiness.json');
    expect(workflow).toContain('docs/security/evidence/runtime/public-production-release-env-readiness.json');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain(PINNED_UPLOAD_ARTIFACT);
  });

  it('binds validation to exact current main and the canonical protected Production environment', () => {
    expect(workflow).toContain('environment: Production');
    expect(workflow).not.toContain('environment: ${{ inputs.release_target }}');
    expect(workflow).toContain('RELEASE_TARGET: ${{ inputs.release_target }}');
    expect(workflow).toContain('test "$ASSESSED_COMMIT_INPUT" = "$TARGET_SHA"');
    expect(workflow).toContain('production-environment-governance:');
    expect(workflow).toContain('needs: production-environment-governance');
  });
});
