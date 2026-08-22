import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readinessSource = readFileSync('src/app/api/ready/route.ts', 'utf8');
const dailyMaintenanceSource = readFileSync('src/app/api/internal/daily-maintenance/route.ts', 'utf8');
const intelligenceRefreshSource = readFileSync('src/app/api/intelligence/refresh/route.ts', 'utf8');
const complianceAlertsSource = readFileSync('src/app/api/internal/compliance-alerts/route.ts', 'utf8');

describe('production readiness maintenance data-plane contract', () => {
  it('keeps readiness coupled to the scheduled maintenance jobs', () => {
    expect(dailyMaintenanceSource).toContain("'/api/internal/compliance-alerts'");
    expect(dailyMaintenanceSource).toContain("'/api/intelligence/refresh'");

    expect(intelligenceRefreshSource).toContain(".from('intelligence_items')");
    expect(complianceAlertsSource).toContain(".from('email_notification_events')");
    expect(complianceAlertsSource).toContain(".select('id,name,next_review_at,organization_id,organizations(id,name,created_by)')");
  });

  it('probes every scheduled maintenance dependency before declaring the database ready', () => {
    expect(readinessSource).toContain("supabase.from('intelligence_items').select('id').limit(1)");
    expect(readinessSource).toContain("supabase.from('email_notification_events').select('id').limit(1)");
    expect(readinessSource).toContain("supabase.from('vendors').select('id,next_review_at').limit(1)");
    expect(readinessSource).toMatch(
      /const maintenanceDataPlaneReady = !intelligenceItems\.error\s*&& !notificationEvents\.error\s*&& !vendorMaintenance\.error;/,
    );
  });

  it('fails database readiness closed when the maintenance data plane is unavailable', () => {
    expect(readinessSource).toMatch(
      /detail: subscriptionsReadable && commercialMutationsReady && maintenanceDataPlaneReady \? 'ok' : 'not_ready'/,
    );
    expect(readinessSource).toMatch(
      /const databaseReachable = database\.adminClient\s*&& database\.subscriptionsReadable\s*&& commercialMutationsReady\s*&& database\.maintenanceDataPlaneReady;/,
    );
  });
});
