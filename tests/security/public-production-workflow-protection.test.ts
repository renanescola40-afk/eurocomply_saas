import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/public-production-final.yml', 'utf8');

describe('public production workflow protection', () => {
  it('requires the protected Production environment', () => {
    expect(workflow).toContain('environment: Production');
  });

  it('serializes production validations instead of cancelling an active release', () => {
    expect(workflow).toContain('group: public-production-final');
    expect(workflow).toContain('cancel-in-progress: false');
  });

  it('binds the uploaded artifact to the validated SHA and fails when evidence is absent', () => {
    expect(workflow).toContain('name: public-production-final-validation-${{ github.sha }}');
    expect(workflow).toContain('if-no-files-found: error');
    expect(workflow).toContain('retention-days: 90');
  });

  it('keeps the release commit and build SHA bound to the dispatched commit', () => {
    expect(workflow).toContain('RELEASE_COMMIT_SHA: ${{ github.sha }}');
    expect(workflow).toContain('RELEASE_BUILD_SHA: ${{ github.sha }}');
  });
});
