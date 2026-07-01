import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = () => readFileSync('src/app/api/prelaunch/route.ts', 'utf8');

describe('prelaunch waitlist capture resilience', () => {
  it('falls back to the existing sales lead table when the dedicated waitlist table is unavailable', () => {
    const source = routeSource();

    expect(source).toContain(".from('waitlist_leads')");
    expect(source).toContain('buildSalesLeadFallbackRecord(request, record)');
    expect(source).toContain(".from('sales_leads').insert");
    expect(source).toContain("storage: 'sales_leads'");
  });

  it('does not immediately fail public submissions before trying the internal notification fallback', () => {
    const source = routeSource();
    const failedSaveIndex = source.indexOf('if (!saveResult.saved) {');
    const notifyIndex = source.indexOf('const fallbackNotification = await notifyInternalTeam(request, record);');
    const unavailableIndex = source.indexOf("{ error: 'Unable to join waitlist right now.' }");

    expect(failedSaveIndex).toBeGreaterThan(-1);
    expect(notifyIndex).toBeGreaterThan(failedSaveIndex);
    expect(unavailableIndex).toBeGreaterThan(notifyIndex);
    expect(source).toContain("status: 'received'");
    expect(source).toContain('{ status: 202 }');
  });
});
