import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/vercel-production.yml'),
  'utf8',
);

describe('Vercel production deployment authority', () => {
  it('requires manual dispatch with exact confirmation and never deploys on push', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('release_sha:');
    expect(workflow).toContain('confirmation:');
    expect(workflow).toContain('DEPLOY_PRODUCTION');
    expect(workflow).not.toMatch(/^\s{2}push:/m);
  });

  it('accepts only the exact current main tip and reverifies it immediately before deploy', () => {
    expect(workflow).toContain('ref: main');
    expect(workflow).toContain('ref: ${{ inputs.release_sha }}');
    expect(workflow).toContain('test "$(git rev-parse origin/main)" = "${RELEASE_SHA,,}"');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "${RELEASE_SHA,,}"');

    const build = workflow.indexOf('Build Vercel production artifact');
    const finalReverify = workflow.indexOf('Reverify current main immediately before production deployment');
    const deployment = workflow.indexOf('Deploy prebuilt artifact to Vercel production');
    expect(build).toBeGreaterThan(-1);
    expect(finalReverify).toBeGreaterThan(build);
    expect(deployment).toBeGreaterThan(finalReverify);

    const finalBoundary = workflow.slice(finalReverify, deployment);
    expect(finalBoundary).toContain('git fetch --no-tags origin main');
    expect(finalBoundary).toContain('test "$(git rev-parse HEAD)" = "${RELEASE_SHA,,}"');
    expect(finalBoundary).toContain('test "$(git rev-parse origin/main)" = "${RELEASE_SHA,,}"');
  });

  it('uses protected production approval and immutable tool references', () => {
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain(
      'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0',
    );
    expect(workflow).toContain(
      'actions/setup-node@249970729cb0ef3589644e2896645e5dcba9c38',
    );
    expect(workflow).toContain("VERCEL_CLI_VERSION: '56.3.2'");
    expect(workflow).toContain('"vercel@${VERCEL_CLI_VERSION}" deploy --prebuilt --prod');
    expect(workflow).not.toMatch(/actions\/(?:checkout|setup-node)@v\d+/);
    expect(workflow).not.toContain('npx vercel ');
  });

  it('keeps Supabase Auth as the only release identity authority', () => {
    expect(workflow).not.toMatch(/CLERK_/);
    expect(
      existsSync(join(process.cwd(), '.github/workflows/supabase-clerk-org-migration-validation.yml')),
    ).toBe(false);
  });
});
