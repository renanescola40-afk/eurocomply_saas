import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const complianceAlerts = readFileSync('src/app/api/internal/compliance-alerts/route.ts', 'utf8');
const intelligenceRefresh = readFileSync('src/app/api/intelligence/refresh/route.ts', 'utf8');
const emailSender = readFileSync('src/lib/email/server-sender.ts', 'utf8');
const dailyMaintenance = readFileSync('src/app/api/internal/daily-maintenance/route.ts', 'utf8');
const manifest = readFileSync('config/supabase-forward-reconciliation.json', 'utf8');

describe('pre-V21 Production runtime compatibility', () => {
  it('defers compliance alerts before any email path when the governed data plane is absent', () => {
    const probeIndex = complianceAlerts.indexOf('const dataPlane = await getComplianceAlertDataPlaneStatus()');
    const alertExecutionIndex = complianceAlerts.indexOf('const [documentAlerts, vendorAlerts] = await Promise.all');

    expect(complianceAlerts).toContain("supabase.from('email_notification_events').select('id').limit(1)");
    expect(complianceAlerts).toContain("supabase.from('vendors').select('id,next_review_at').limit(1)");
    expect(complianceAlerts).toContain('!isExpectedMissingSupabaseMaintenanceSchema(error)');
    expect(complianceAlerts).toContain("reason: PRE_V19_DEFER_REASON");
    expect(complianceAlerts).toContain("status: 'deferred'");
    expect(probeIndex).toBeGreaterThan(-1);
    expect(alertExecutionIndex).toBeGreaterThan(probeIndex);
  });

  it('does not downgrade unexpected compliance-alert database failures', () => {
    expect(complianceAlerts).toContain("area: 'compliance_alert_data_plane_probe'");
    expect(complianceAlerts).toContain('throw unexpectedError;');
  });

  it('defers intelligence only while its relation is absent and keeps column drift fatal', () => {
    const compatibilityIndex = intelligenceRefresh.indexOf('if (isExpectedMissingSupabaseRelation(error))');
    const errorIndex = intelligenceRefresh.indexOf("console.error('[intelligence:refresh] upsert failed'");

    expect(intelligenceRefresh).toContain(".from('intelligence_items')");
    expect(intelligenceRefresh).toContain("status: 'deferred'");
    expect(intelligenceRefresh).toContain("reason: PRE_V19_DEFER_REASON");
    expect(intelligenceRefresh).not.toContain('isExpectedMissingSupabaseSchema(error)');
    expect(compatibilityIndex).toBeGreaterThan(-1);
    expect(errorIndex).toBeGreaterThan(compatibilityIndex);
    expect(intelligenceRefresh).toContain("{ status: 500 }");
  });

  it('keeps transactional delivery idempotent while reporting audit persistence truthfully', () => {
    expect(emailSender).toContain("audit: EmailDeliveryAuditStatus;");
    expect(emailSender).toContain("return 'schema_unavailable';");
    expect(emailSender).toContain("return 'write_failed';");
    expect(emailSender).toContain("'Idempotency-Key': input.idempotencyKey");
    expect(emailSender).toContain('const deliveryInput = apiKey ? withResendIdempotencyKey(input) : input;');

    const schemaFallbackIndex = emailSender.indexOf('if (isExpectedMissingSupabaseSchema(error))');
    const auditErrorReportIndex = emailSender.indexOf("area: 'email_delivery_log_write'");
    expect(schemaFallbackIndex).toBeGreaterThan(-1);
    expect(auditErrorReportIndex).toBeGreaterThan(schemaFallbackIndex);
  });

  it('keeps daily maintenance scheduled and expands the governed package with payment-first plus trusted-access closure', () => {
    expect(dailyMaintenance).toContain("'/api/internal/compliance-alerts'");
    expect(dailyMaintenance).toContain("'/api/intelligence/refresh'");

    const parsed = JSON.parse(manifest) as { changeSet?: string; migrations?: Array<{ filename?: string }> };
    expect(parsed.changeSet).toBe('2026-08-24-enterprise-data-plane-payment-first-trusted-access-closure-v21');
    expect(parsed.migrations).toHaveLength(31);
    expect(parsed.migrations?.slice(25, 27).map((item) => item.filename)).toEqual([
      '20260823123000_payment_first_commercial_data_plane.sql',
      '20260823131500_payment_first_gap_analysis_and_storage.sql',
    ]);
    expect(parsed.migrations?.slice(-4).map((item) => item.filename)).toEqual([
      '20260824185900_prepare_enterprise_trusted_access_legacy_compatibility.sql',
      '20260824190000_reconcile_enterprise_trusted_access_runtime.sql',
      '20260824190100_finalize_enterprise_trusted_access_operation_contract.sql',
      '20260824190200_harden_enterprise_trusted_access_runtime_contract.sql',
    ]);
  });
});
