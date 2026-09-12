import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  join(process.cwd(), '.github/workflows/vercel-production.yml'),
  'utf8',
);

describe('Vercel Production deployment sequencing', () => {
  it('keeps release authorization fail-closed before mutation and runtime readiness after deploy', () => {
    const predeployAuthorization = workflow.indexOf(
      '- name: Run pre-deployment release authorization gates',
    );
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

    expect(predeployAuthorization).toBeGreaterThan(-1);
    expect(syncBindings).toBeGreaterThan(predeployAuthorization);
    expect(proveBindings).toBeGreaterThan(syncBindings);
    expect(buildArtifact).toBeGreaterThan(proveBindings);
    expect(deployArtifact).toBeGreaterThan(buildArtifact);
    expect(releaseReadiness).toBeGreaterThan(deployArtifact);
    expect(enterpriseReadiness).toBeGreaterThan(releaseReadiness);

    const preDeploy = workflow.slice(0, deployArtifact);
    for (const command of [
      'npm run security:release-candidate',
      'npm run security:release-evidence',
      'npm run security:release-approval',
      'npm run security:release-go-no-go',
      'npm run security:release-rollback',
      'npm run security:release-incident-response',
      'npm run security:release-post-incident',
      'npm run security:release-support-readiness',
      'npm run security:release-operations',
      'npm run release:rollback:dry-run',
    ]) {
      expect(preDeploy).toContain(command);
    }
    expect(preDeploy).not.toContain('- name: Run release readiness gate\n');
    expect(preDeploy).not.toContain('- name: Run enterprise readiness gate\n');
  });
});
