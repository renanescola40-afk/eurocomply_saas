import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260902162000_linkedin_marketing_queue.sql',
  'utf8',
);
const queue = readFileSync('src/lib/marketing/linkedin-queue.ts', 'utf8');
const processRoute = readFileSync(
  'src/app/api/internal/marketing/linkedin/process/route.ts',
  'utf8',
);
const vercel = readFileSync('vercel.json', 'utf8');

describe('LinkedIn autonomous marketing queue', () => {
  it('keeps the editorial queue private from browser roles', () => {
    expect(migration).toContain('alter table public.linkedin_marketing_posts enable row level security');
    expect(migration).toContain(
      'revoke all on table public.linkedin_marketing_posts from public, anon, authenticated',
    );
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.linkedin_marketing_posts to service_role',
    );
  });

  it('claims scheduled posts atomically with skip-locked semantics', () => {
    expect(migration).toContain('create or replace function public.claim_linkedin_marketing_posts');
    expect(migration).toContain('for update skip locked');
    expect(migration).toContain("set status = 'publishing'");
    expect(migration).toContain('attempt_count = p.attempt_count + 1');
  });

  it('does not automatically retry uncertain LinkedIn outcomes', () => {
    expect(migration).toContain("'needs_review'");
    expect(queue).toContain("status: 'needs_review' as const");
    expect(queue).toContain("errorCode: 'linkedin_network_uncertain'");
    expect(queue).not.toContain("status: 'scheduled'");
  });

  it('protects the processor with existing internal controls', () => {
    expect(processRoute).toContain('enforceInternalAuthenticationRateLimit');
    expect(processRoute).toContain('isAuthorizedInternalCronRequest');
    expect(processRoute).toContain('processLinkedInMarketingQueue');
    expect(processRoute).toContain('noStoreJson');
  });

  it('schedules the processor through the production cron configuration', () => {
    expect(vercel).toContain('/api/internal/marketing/linkedin/process');
    expect(vercel).toContain('*/15 * * * *');
  });
});
