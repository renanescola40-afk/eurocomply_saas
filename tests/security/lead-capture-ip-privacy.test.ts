import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = () => readFileSync('src/app/api/leads/route.ts', 'utf8');

describe('lead capture IP privacy', () => {
  it('hashes forwarded IP hints before adding them to persisted or webhook lead records', () => {
    const source = routeSource();
    const rawHintIndex = source.indexOf('const ipHint = getClientHint(request);', source.indexOf('export async function POST'));
    const recordIndex = source.indexOf('const record: LeadRecord = {');
    const hashedPersistenceIndex = source.indexOf("ip_hint: ipHint === 'unknown' ? null : hashRateLimitIp(ipHint)");
    const saveIndex = source.indexOf('const savedToSupabase = await saveToSupabase(record);');
    const webhookIndex = source.indexOf('const sentToWebhook = await sendWebhook(record);');

    expect(source).toContain("import { hashRateLimitIp } from '@/server/security/rate-limit';");
    expect(rawHintIndex).toBeGreaterThan(-1);
    expect(recordIndex).toBeGreaterThan(rawHintIndex);
    expect(hashedPersistenceIndex).toBeGreaterThan(recordIndex);
    expect(saveIndex).toBeGreaterThan(hashedPersistenceIndex);
    expect(webhookIndex).toBeGreaterThan(hashedPersistenceIndex);
    expect(source).not.toContain('ip_hint: ipHint,');
  });

  it('does not persist a synthetic unknown identifier', () => {
    const source = routeSource();

    expect(source).toContain("ip_hint: ipHint === 'unknown' ? null : hashRateLimitIp(ipHint)");
  });
});
