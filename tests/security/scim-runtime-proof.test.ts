import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/scim-runtime-proof.yml', 'utf8');
const runtime = readFileSync('scripts/identity/run-scim-runtime-proof.mjs', 'utf8');
const validator = readFileSync('scripts/identity/check-scim-runtime-evidence.mjs', 'utf8');
const lifecycleWorkflow = readFileSync('.github/workflows/identity-access-lifecycle-proof.yml', 'utf8');
const laneContracts = readFileSync('scripts/enterprise/runtime-lane-contracts.mjs', 'utf8');
const manifest = readFileSync('docs/security/evidence/enterprise-runtime-campaign-manifest.json', 'utf8');

describe('SCIM runtime proof megapack', () => {
  it('uses protected manual exact-main execution without mutable workflow identity', () => {
    expect(workflow).toContain('name: SCIM Runtime Proof');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-identity-proof');
    expect(workflow).toContain('EXECUTE_SCIM_RUNTIME_PROOF');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('test "$GITHUB_SHA" = "$TARGET_SHA"');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('\nrun-name:');
    expect(lifecycleWorkflow).not.toContain('\nrun-name:');
  });

  it('exercises SCIM discovery, denial, Users and Groups lifecycle', () => {
    for (const token of [
      '/ServiceProviderConfig',
      '/ResourceTypes',
      '/Schemas',
      'unauthorizedDenied',
      'userCreated',
      'userFilterValidated',
      'userPatched',
      'userDeactivated',
      'userReactivated',
      'groupCreated',
      'groupFilterValidated',
      'groupMembershipValidated',
      'groupDeleted',
      'userDeprovisioned',
      'deprovisionedUserInactive',
    ]) {
      expect(runtime).toContain(token);
    }
  });

  it('retains only bounded redacted exact-SHA evidence', () => {
    for (const token of [
      "schema: 'risck-comply.scim-runtime-evidence.v1'",
      "controlsVerified: passed ? ['IAM-09'] : []",
      'containsSensitiveValues: false',
      'bearerTokenStored: false',
      'emailStored: false',
      'externalIdentifiersStored: false',
      'resourceIdentifiersStored: false',
      'providerResponsesStored: false',
      'networkHeadersStored: false',
    ]) {
      expect(runtime).toContain(token);
    }
    expect(runtime).not.toContain('userName,');
    expect(runtime).not.toContain('bearer,');
  });

  it('fails closed unless every protocol and cleanup check passes', () => {
    for (const token of [
      'serviceProviderConfigValidated',
      'unauthorizedDenied',
      'userReactivated',
      'groupMembershipValidated',
      'deletedGroupDenied',
      'deprovisionedUserInactive',
      'noStoreResponses',
      'scimContentType',
      'cleanupComplete',
      'observedSha !== evidence.targetSha',
    ]) {
      expect(validator).toContain(token);
    }
  });

  it('adds SCIM as a mandatory exact-SHA runtime campaign lane', () => {
    expect(laneContracts).toContain("'IAM-SCIM'");
    expect(laneContracts).toContain("workflow: 'scim-runtime-proof.yml'");
    expect(laneContracts).toContain("artifactPrefix: 'scim-runtime-proof-'");
    expect(laneContracts).toContain("requiredEvidenceFiles: Object.freeze(['scim-runtime-validation.json'])");
    expect(manifest).toContain('"id":"IAM-SCIM"');
    expect(manifest).toContain('"workflow":"scim-runtime-proof.yml"');
  });
});
