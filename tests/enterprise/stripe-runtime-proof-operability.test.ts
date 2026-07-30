import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const builder = readFileSync('scripts/enterprise/build-stripe-runtime-proof.mjs', 'utf8');
const finalizer = readFileSync('scripts/enterprise/finalize-stripe-runtime-proof.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/stripe-entitlement-runtime-proof.yml', 'utf8');

describe('Stripe runtime proof operability', () => {
  it('prints a sanitized check matrix and emits the promotion input', () => {
    expect(builder).toContain("writeFileSync(`${outputDir}/evidence.json`");
    expect(builder).toContain('failedChecks');
    expect(builder).toContain('eventProcessed');
    expect(builder).toContain('snapshotObserved');
    expect(builder).toContain('policyObserved');
    expect(builder).toContain('reconciliationObserved');
    expect(builder).toContain('console.log(JSON.stringify');
  });

  it('only finalizes after the raw correlated catalog is gone', () => {
    expect(finalizer).toContain("const rawEvidenceDeleted = !existsSync(catalogPath)");
    expect(finalizer).toContain("'rawEvidenceDeleted'");
    expect(finalizer).toContain("evidence.status = passed ? 'Complete' : 'Open'");
    expect(finalizer).toContain("evidence.validationStatus = passed ? 'passed' : 'failed'");
  });

  it('retains sanitized diagnostics before enforcing a failed decision', () => {
    expect(workflow).toContain('id: build_proof');
    expect(workflow).toContain('continue-on-error: true');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('finalize-stripe-runtime-proof.mjs');
    expect(workflow).toContain('Upload retained proof');
    expect(workflow).toContain('Enforce proof decision');
    expect(workflow.indexOf('Upload retained proof')).toBeLessThan(workflow.indexOf('Enforce proof decision'));
  });
});
