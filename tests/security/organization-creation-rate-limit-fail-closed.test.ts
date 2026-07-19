import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/organizations.ts';
const rateLimitPath = 'src/server/security/rate-limit.ts';

describe('organization creation rate limiting', () => {
  it('overrides the lower-risk general-api policy to fail closed before tenant creation', () => {
    const source = readFileSync(actionPath, 'utf8');
    const actionStart = source.indexOf('export async function createOrganization');
    const actionSource = source.slice(actionStart);
    const limiterCall = actionSource.indexOf('await checkDistributedRateLimit');
    const creationRpc = actionSource.indexOf('supabase.rpc(ATOMIC_ORGANIZATION_CREATION_RPC');

    expect(actionSource).toContain("policy: 'general-api'");
    expect(actionSource).toContain("failureMode: 'fail-closed'");
    expect(actionSource).toContain("action: 'organization.create'");
    expect(actionSource).toContain("route: 'server-action:createOrganization'");
    expect(limiterCall).toBeGreaterThan(-1);
    expect(creationRpc).toBeGreaterThan(-1);
    expect(limiterCall).toBeLessThan(creationRpc);
  });

  it('documents why the explicit override is required and preserves the existing threshold', () => {
    const actionSource = readFileSync(actionPath, 'utf8');
    const rateLimitSource = readFileSync(rateLimitPath, 'utf8');

    expect(rateLimitSource).toContain("'general-api': policy('general-api', 'general-api', 300, 60_000, 'fail-open'");
    expect(actionSource).toContain('limit: 3');
    expect(actionSource).toContain('windowMs: 10 * 60 * 1000');
    expect(actionSource).toContain('const ATOMIC_ORGANIZATION_CREATION_RPC');
    expect(actionSource).toContain('if (!audit.persisted)');
  });
});
