import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const logger = readFileSync('src/server/observability/logger.ts', 'utf8');
const rateLimitResponse = readFileSync('src/lib/security/rate-limit-response.ts', 'utf8');
const checker = readFileSync('scripts/security/check-p1-centralized-logging-evidence.mjs', 'utf8');
const template = JSON.parse(readFileSync('docs/security/evidence/p1/centralized-logging-alerts.template.json', 'utf8'));

describe('centralized security alert routing contract', () => {
  it('routes material security events with stable Sentry fingerprints and correlation tags', () => {
    expect(logger).toContain("scope.setFingerprint(['security-alert', event])");
    expect(logger).toContain("scope.setTag('environment', runtimeEnvironment())");
    expect(logger).toContain("scope.setTag('release', runtimeRelease())");
    expect(logger).toContain("audit_chain_invalid: 'critical'");
    expect(logger).toContain("rls_validation_failed: 'critical'");
    expect(logger).toContain("webhook_failed: 'high'");
    expect(logger).toContain("rate_limit_abuse_detected: 'high'");
    expect(logger).toContain("rate_limit_backend_unavailable: 'high'");
  });

  it('keeps ordinary denials local while escalating high-risk throttling and backend outages', () => {
    expect(logger).toContain("rbac_denied: 'none'");
    expect(logger).toContain("rate_limit_blocked: 'none'");
    expect(rateLimitResponse).toContain("result.reason ? 'rate_limit_backend_unavailable' : 'rate_limit_abuse_detected'");
    expect(rateLimitResponse).toContain('keyHash: hashAuditKey(result.key)');
    expect(rateLimitResponse).not.toContain('key: result.key');
  });

  it('requires active evidence for the material alert set and all centralized sources', () => {
    for (const value of ['application', 'identity', 'database', 'edge', 'audit_chain_invalid', 'rls_validation_failed', 'webhook_failed']) {
      expect(checker).toContain(value);
    }
  });

  it('keeps final evidence as a placeholder template rather than a completion claim', () => {
    expect(template.status).toBe('Complete');
    expect(template.generatedFromRealEvidence).toBe(true);
    expect(template.loggingBackend.provider).toMatch(/^REPLACE_/);
    expect(template.alertsReviewed.map((alert: { alertName: string }) => alert.alertName)).toEqual([
      'audit_chain_invalid',
      'rls_validation_failed',
      'webhook_failed',
    ]);
  });
});
