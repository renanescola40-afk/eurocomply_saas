import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = () => readFileSync('src/app/api/prelaunch/route.ts', 'utf8');

describe('prelaunch waitlist capture resilience', () => {
  it('falls back to the existing sales lead table when the dedicated waitlist table is unavailable', () => {
    const source = routeSource();

    expect(source).toContain(".from('waitlist_leads')");
    expect(source).toContain('buildSalesLeadFallbackRecord(request, record)');
    expect(source).toContain(".from('sales_leads')");
    expect(source).toContain('.insert(fallbackRecord)');
    expect(source).toContain("storage: 'sales_leads'");
  });

  it('deduplicates fallback sales leads by normalized email and source before inserting', () => {
    const source = routeSource();
    const lookupIndex = source.indexOf(".select('id')");
    const workEmailIndex = source.indexOf(".eq('work_email', record.email)");
    const sourceIndex = source.indexOf(".eq('source', fallbackRecord.source)");
    const existingIndex = source.indexOf('if (!lookupError && existingFallback?.id) {');
    const insertIndex = source.indexOf('.insert(fallbackRecord)');

    expect(lookupIndex).toBeGreaterThan(-1);
    expect(workEmailIndex).toBeGreaterThan(lookupIndex);
    expect(sourceIndex).toBeGreaterThan(workEmailIndex);
    expect(existingIndex).toBeGreaterThan(sourceIndex);
    expect(insertIndex).toBeGreaterThan(existingIndex);
    expect(source).toContain("return { saved: true, inserted: false, storage: 'sales_leads' };");
  });

  it('uses the lead webhook as another durable capture fallback before reporting failure', () => {
    const source = routeSource();
    const missingSupabaseIndex = source.indexOf('if (!supabase) {');
    const webhookEnvIndex = source.indexOf('process.env.RISCK_COMPLY_LEAD_WEBHOOK_URL');
    const salesFallbackFailureIndex = source.indexOf("console.error('[prelaunch] waitlist_sales_lead_fallback_failed');");
    const finalFailureIndex = source.indexOf("return { saved: false, inserted: false, storage: 'none' };");

    expect(webhookEnvIndex).toBeGreaterThan(-1);
    expect(missingSupabaseIndex).toBeGreaterThan(-1);
    expect(source).toContain("event: 'waitlist_lead.created'");
    expect(source).toContain("storage: 'webhook'");
    expect(source).toContain('const webhookSaved = await sendWaitlistWebhook(request, record);');
    expect(salesFallbackFailureIndex).toBeGreaterThan(-1);
    expect(finalFailureIndex).toBeGreaterThan(salesFallbackFailureIndex);
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
