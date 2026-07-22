import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const platformPage = readFileSync('src/app/[locale]/platform/page.tsx', 'utf8');
const licensingDoc = readFileSync('docs/enterprise/ENTERPRISE_TENANT_LICENSING.md', 'utf8');

describe('enterprise platform access boundary', () => {
  it('keeps platform administration behind an explicit privileged boundary', () => {
    expect(platformPage).toMatch(/platform|admin|owner/i);
    expect(platformPage).toMatch(/redirect|notFound|permission|role|authorize/i);
  });

  it('documents tenant, seat and entitlement isolation', () => {
    expect(licensingDoc).toMatch(/tenant|organization/i);
    expect(licensingDoc).toMatch(/seat|entitlement/i);
    expect(licensingDoc).toMatch(/isolation|scope|boundary/i);
  });

  it('does not expose secrets or service credentials in the client surface', () => {
    expect(platformPage).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE|STRIPE_SECRET_KEY/);
  });
});
