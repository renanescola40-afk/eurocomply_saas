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
    expect(finalizer).not.toContain('existsSync');
    expect(finalizer).toContain('const rawEvidenceDeleted = fileIsAbsent(catalogPath)');
    expect(finalizer).toContain("'rawEvidenceDeleted'");
    expect(finalizer).toContain("evidence.status = passed ? 'Complete' : 'Open'");
    expect(finalizer).toContain("evidence.validationStatus = passed ? 'passed' : 'failed'");
  });

  it('reads inputs directly and replaces sanitized outputs atomically', () => {
    expect(finalizer).toContain("source = readFileSync(filePath, 'utf8')");
    expect(finalizer).toContain("flag: 'wx'");
    expect(finalizer).toContain('renameSync(tempPath, targetPath)');
    expect(finalizer).toContain('rmSync(tempPath, { force: true })');
  });

  it('retains sanitized diagnostics before enforcing a failed decision', () => {
    expect(workflow).not.toContain('continue-on-error');
    expect(workflow).toContain('finalize-stripe-runtime-proof.mjs');
    expect(workflow).toContain('Upload retained proof');
    expect(workflow).toContain('Enforce proof decision');
    expect(workflow).toContain("evidence.status !== 'Complete'");
    expect(workflow.indexOf('Upload retained proof')).toBeLessThan(workflow.indexOf('Enforce proof decision'));
  });
});
