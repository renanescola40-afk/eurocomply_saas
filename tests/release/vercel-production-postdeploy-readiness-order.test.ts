import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/vercel-production.yml'),
  'utf8',
);

describe('Vercel Production deployment sequencing', () => {
  it('synchronizes provider bindings before proving them and runs runtime readiness only after deploy', () => {
    const syncBindings = workflow.indexOf(
      '- name: Synchronize provider-proof runtime bindings to Vercel production',
    );
    const proveBindings = workflow.indexOf(
      '- name: Prove synchronized Production provider bindings',
    );
    const buildArtifact = workflow.indexOf('- name: Build Vercel production artifact');
    const deployArtifact = workflow.indexOf('- name: Deploy prebuilt artifact to Vercel production');
    const releaseReadiness = workflow.indexOf(
      '- name: Run release readiness gate after Production deployment',
    );
    const enterpriseReadiness = workflow.indexOf(
      '- name: Run enterprise readiness gate after Production deployment',
    );

    expect(syncBindings).toBeGreaterThan(-1);
    expect(proveBindings).toBeGreaterThan(syncBindings);
    expect(buildArtifact).toBeGreaterThan(proveBindings);
    expect(deployArtifact).toBeGreaterThan(buildArtifact);
    expect(releaseReadiness).toBeGreaterThan(deployArtifact);
    expect(enterpriseReadiness).toBeGreaterThan(releaseReadiness);

    const preDeploy = workflow.slice(0, deployArtifact);
    expect(preDeploy).not.toContain('- name: Run release readiness gate\n');
    expect(preDeploy).not.toContain('- name: Run enterprise readiness gate\n');
  });
});
