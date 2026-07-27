import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/stripe-entitlement-runtime-proof.yml', 'utf8');

describe('Stripe runtime proof workflow governance', () => {
  it('requires manual protected execution and exact main SHA', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: ${{ inputs.target_environment }}');
    expect(workflow).toContain('test "${RELEASE_SHA,,}" = "$main_sha"');
    expect(workflow).toContain('PROVE_STRIPE_ENTITLEMENT_RUNTIME');
  });

  it('requires Stripe test mode and read-only evidence collection', () => {
    expect(workflow).toContain('stripe_test_mode_confirmed');
    expect(workflow).toContain('test "${{ inputs.stripe_test_mode_confirmed }}" = "true"');
    expect(workflow).toContain('stripe-runtime-proof.sql');
  });

  it('removes raw catalog and uploads sanitized retained proof', () => {
    expect(workflow).toContain('Remove raw correlated catalog');
    expect(workflow).toContain('rm artifacts/stripe-runtime-proof/catalog.txt');
    expect(workflow).toContain('retention-days: 90');
  });
});
