import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const deployWorkflow = readFileSync('.github/workflows/vercel-production.yml', 'utf8');
const providerProof = readFileSync('scripts/security/run-production-provider-runtime-proof.mjs', 'utf8');
const evidenceValidator = readFileSync('scripts/release/validate-production-secrets-runtime-evidence.mjs', 'utf8');
const readinessRoute = readFileSync('src/app/api/ready/route.ts', 'utf8');
const environmentExample = readFileSync('.env.example', 'utf8');

describe('Production runtime truth contract', () => {
  it('binds transactional email to Vercel Production and provider evidence', () => {
    for (const key of ['RESEND_API_KEY', 'EMAIL_FROM', 'REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY']) {
      expect(deployWorkflow).toContain(key);
      expect(providerProof).toContain(`'${key}'`);
    }
    expect(deployWorkflow).toContain("REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY: 'true'");
    expect(providerProof).toContain('transactionalEmailBindingsPresent');
    expect(providerProof).toContain('transactionalEmailGuardEnabled');
    expect(evidenceValidator).toContain("'transactionalEmailBindingsPresent'");
    expect(evidenceValidator).toContain("'transactionalEmailGuardEnabled'");
  });

  it('requires and synchronizes the selected malware-scanner transport', () => {
    for (const key of [
      'REQUIRE_MALWARE_SCAN_FOR_UPLOADS',
      'MALWARE_SCANNER_PROVIDER',
      'MALWARE_SCANNER_ENDPOINT',
      'MALWARE_SCANNER_URL',
      'MALWARE_SCANNER_ALLOWED_HOSTS',
      'MALWARE_SCANNER_CLAMAV_HOST',
      'MALWARE_SCANNER_CLAMAV_PORT',
    ]) {
      expect(deployWorkflow).toContain(key);
      expect(environmentExample).toContain(`${key}=`);
    }
    expect(deployWorkflow).toContain('http|generic-http|webhook)');
    expect(deployWorkflow).toContain('clamav|clamd)');
    expect(deployWorkflow).toContain('sync_sensitive_if_present');
    expect(deployWorkflow).toContain('sync_public_if_present');
    expect(providerProof).toContain('malwareScanningGuardEnabled');
    expect(providerProof).toContain('malwareScannerProviderSupported');
    expect(providerProof).toContain('malwareScannerTransportBindingPresent');
    expect(evidenceValidator).toContain("'malwareScannerTransportBindingPresent'");
  });

  it('keeps metric snapshot writes disabled until V19 and fails closed if later enabled against incompatible schema', () => {
    expect(deployWorkflow).toContain("ENABLE_DASHBOARD_METRIC_SNAPSHOTS: 'false'");
    expect(deployWorkflow).toContain("if [ \"$ENABLE_DASHBOARD_METRIC_SNAPSHOTS\" != 'false' ]");
    expect(providerProof).toContain("'ENABLE_DASHBOARD_METRIC_SNAPSHOTS'");
    expect(providerProof).toContain('metricSnapshotPolicyBindingPresent');
    expect(providerProof).toContain("metricSnapshotWritesDisabled = metricSnapshotPolicy === 'false'");
    expect(evidenceValidator).toContain("'metricSnapshotWritesDisabled'");
    expect(readinessRoute).toContain("process.env[ENABLE_DASHBOARD_METRIC_SNAPSHOTS_ENV] === 'true'");
    expect(readinessRoute).toContain(".from('compliance_metric_snapshots')");
    for (const column of [
      'open_tasks',
      'open_risks',
      'critical_risks',
      'high_risk_vendors',
      'missing_documents',
      'total_tasks',
      'total_risks',
      'total_vendors',
      'total_documents',
    ]) {
      expect(readinessRoute).toContain(`'${column}'`);
    }
  });

  it('keeps provider evidence redacted while evaluating only allowlisted non-secret controls', () => {
    expect(providerProof).toContain('decrypt=false');
    expect(providerProof).toContain('NON_SECRET_VERCEL_CONTROLS');
    expect(providerProof).toContain('/v1/projects/');
    expect(providerProof).toContain('selectedNonSecretControlsResolved');
    expect(providerProof).toContain('selectedNonSecretControlValuesStored: false');
    expect(providerProof).toContain('providerResponseBodiesStored: false');
    expect(providerProof).toContain('decryptedProviderEnvironmentValuesStored: false');
    expect(providerProof).not.toContain('console.log(transactionalEmailGuard');
    expect(providerProof).not.toContain('console.log(malwareScannerProvider');
    expect(providerProof).not.toContain('console.log(metricSnapshotPolicy');
  });
});
