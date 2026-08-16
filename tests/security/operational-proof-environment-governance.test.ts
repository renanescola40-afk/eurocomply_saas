import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dataGovernance = readFileSync('.github/workflows/data-governance-runtime-proof.yml', 'utf8');
const incidentContinuity = readFileSync('.github/workflows/incident-continuity-runtime-proof.yml', 'utf8');
const procurementTrust = readFileSync('.github/workflows/procurement-trust-runtime-proof.yml', 'utf8');

const GOVERNANCE_CHECK = 'node scripts/security/check-github-environment-governance.mjs';
const PINNED_CHECKOUT = 'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0';

function expectOperationalProofBoundary(
  workflow: string,
  governanceJobName: string,
  environmentName: string,
  protectedJobName: string,
  proofStepName: string,
) {
  expect(workflow).toContain('permissions:\n  actions: read\n  contents: read');

  const governanceJob = workflow.indexOf(`  ${governanceJobName}:`);
  const protectedJob = workflow.indexOf(`  ${protectedJobName}:`);
  const producerBoundary = workflow.indexOf('- name: Revalidate protected producer boundary');
  const proofStep = workflow.indexOf(`- name: ${proofStepName}`);

  expect(governanceJob).toBeGreaterThan(-1);
  expect(protectedJob).toBeGreaterThan(governanceJob);
  expect(producerBoundary).toBeGreaterThan(protectedJob);
  expect(proofStep).toBeGreaterThan(producerBoundary);

  const preflight = workflow.slice(governanceJob, protectedJob);
  expect(preflight).toContain('GH_TOKEN: ${{ github.token }}');
  expect(preflight).toContain(`GITHUB_ENVIRONMENT_NAME: ${environmentName}`);
  expect(preflight).toContain("REQUIRE_PROTECTED_BRANCHES: 'true'");
  expect(preflight).toContain('/commits/main');
  expect(preflight).toContain(GOVERNANCE_CHECK);
  expect(preflight).toContain(PINNED_CHECKOUT);
  expect(preflight).not.toMatch(/secrets\./);
  expect(preflight).not.toMatch(/vars\./);

  const protectedText = workflow.slice(protectedJob);
  expect(protectedText).toContain(`needs: ${governanceJobName}`);
  expect(protectedText).toContain(`environment: ${environmentName}`);
  expect(protectedText).toContain('Revalidate exact current main after environment approval');
  expect(protectedText).toContain('Revalidate environment governance after admission');
  expect(protectedText).toContain('Revalidate protected producer boundary');
  expect(protectedText).toContain('git fetch --no-tags --depth=1 origin main');
  expect(protectedText).toContain(GOVERNANCE_CHECK);
  expect(protectedText).not.toContain('git merge-base --is-ancestor');

  const beforeProof = workflow.slice(0, proofStep);
  expect(beforeProof).not.toMatch(/secrets\./);
  expect(beforeProof).not.toMatch(/\$\{\{ vars\./);
}

describe('operational production proof environment governance', () => {
  it('fails closed before data-governance operational attestations are loaded', () => {
    expectOperationalProofBoundary(
      dataGovernance,
      'data-governance-environment-governance',
      'production-data-governance-proof',
      'governance-proof',
      'Execute governance proof',
    );

    expect(dataGovernance).toContain('DATA_RESIDENCY_REGION: ${{ vars.DATA_RESIDENCY_REGION }}');
    expect(dataGovernance).toContain('DATA_RETENTION_DEFAULT_DAYS: ${{ vars.DATA_RETENTION_DEFAULT_DAYS }}');
    expect(dataGovernance).toContain('DATA_EXPORT_ENCRYPTION_REQUIRED: ${{ vars.DATA_EXPORT_ENCRYPTION_REQUIRED }}');
  });

  it('fails closed before incident-response operational attestations are loaded', () => {
    expectOperationalProofBoundary(
      incidentContinuity,
      'incident-environment-governance',
      'production-incident-proof',
      'prove',
      'Run incident continuity proof',
    );

    expect(incidentContinuity).toContain('INCIDENT_SEV1_ACK_TARGET_MINUTES: ${{ vars.INCIDENT_SEV1_ACK_TARGET_MINUTES }}');
    expect(incidentContinuity).toContain('INCIDENT_ONCALL_ROTATION_CONFIGURED: ${{ vars.INCIDENT_ONCALL_ROTATION_CONFIGURED }}');
    expect(incidentContinuity).toContain('INCIDENT_NOTIFICATION_MATRIX_REVIEWED: ${{ vars.INCIDENT_NOTIFICATION_MATRIX_REVIEWED }}');
  });

  it('keeps the procurement trust secret behind exact-main and environment governance', () => {
    expectOperationalProofBoundary(
      procurementTrust,
      'procurement-trust-environment-governance',
      'production-procurement-trust-proof',
      'trust-proof',
      'Execute procurement trust proof',
    );

    const proofStep = procurementTrust.indexOf('- name: Execute procurement trust proof');
    const secretReference = procurementTrust.indexOf('secrets.TRUST_CENTER_PUBLIC_URL');
    expect(secretReference).toBeGreaterThan(proofStep);
    expect(procurementTrust.slice(0, proofStep)).not.toContain('secrets.TRUST_CENTER_PUBLIC_URL');
  });
});
