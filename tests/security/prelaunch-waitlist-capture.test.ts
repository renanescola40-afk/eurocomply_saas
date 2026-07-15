import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = () => readFileSync('src/app/api/prelaunch/route.ts', 'utf8');

describe('prelaunch waitlist capture resilience', () => {
  it('fails closed when distributed rate limiting is unavailable', () => {
    const source = routeSource();
    const rateLimitIndex = source.indexOf('const rateLimited = await enforceRateLimit(request);');
    const bodyReadIndex = source.indexOf('const body = await readBody(request);');

    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).not.toContain("failureMode: 'fail-open'");
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(bodyReadIndex).toBeGreaterThan(rateLimitIndex);
  });

  it('falls back to the existing sales lead table when the dedicated waitlist table is unavailable', () => {
    const source = routeSource();

    expect(source).toContain(".from('waitlist_leads')");
    expect(source).toContain('buildSalesLeadFallbackRecord(request, record)');
    expect(source).toContain(".from('sales_leads')");
    expect(source).toContain('.insert(fallbackRecord)');
    expect(source).toContain("storage: 'sales_leads'");
  });

  it('stores and forwards only a derived IP hint in fallback records', () => {
    const source = routeSource();

    expect(source).toContain("import { hashRateLimitIp } from '@/server/security/rate-limit';");
    expect(source).toContain("return ipHint === 'unknown' ? null : hashRateLimitIp(ipHint);");
    expect(source).toContain('ip_hint: getPrivacySafeIpHint(request)');
    expect(source).not.toContain('ip_hint: getClientHint(request)');
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

  it('notifies the internal team and returns a received state when durable capture is degraded', () => {
    const source = routeSource();
    const saveResultIndex = source.indexOf('const saveResult = await saveWaitlistLead(request, record);');
    const notifyPredicateIndex = source.indexOf('return saveResult.inserted || !saveResult.saved;');
    const notifyIndex = source.indexOf('await notifyInternalTeam(request, record);');
    const receivedStatusIndex = source.indexOf("status: saveResult.saved ? 'confirmed' : 'received'");
    const receivedMessageIndex = source.indexOf("'Your request was received by the Risck Comply team.'");
    const acceptedStatusIndex = source.indexOf('{ status: saveResult.saved ? 201 : 202 }');

    expect(saveResultIndex).toBeGreaterThan(-1);
    expect(notifyPredicateIndex).toBeGreaterThan(-1);
    expect(notifyIndex).toBeGreaterThan(saveResultIndex);
    expect(receivedStatusIndex).toBeGreaterThan(notifyIndex);
    expect(receivedMessageIndex).toBeGreaterThan(receivedStatusIndex);
    expect(acceptedStatusIndex).toBeGreaterThan(receivedMessageIndex);
  });
});
