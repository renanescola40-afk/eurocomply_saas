import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const scim = readFileSync('src/server/enterprise/scim.ts', 'utf8');

describe('SCIM administrative audit principal', () => {
  it('resolves the token creator only after token and tenant authentication', () => {
    const authenticated = scim.indexOf("row.outcome !== 'authenticated'");
    const resolveActor = scim.indexOf('await resolveScimAuditActor(tokenId, organizationId)');
    const tokenTable = scim.indexOf(".from('enterprise_scim_tokens')");

    expect(authenticated).toBeGreaterThan(-1);
    expect(resolveActor).toBeGreaterThan(authenticated);
    expect(tokenTable).toBeGreaterThan(-1);
    expect(scim).toContain(".eq('id', tokenId)");
    expect(scim).toContain(".eq('organization_id', organizationId)");
    expect(scim).toContain(".eq('status', 'active')");
    expect(scim).toContain(".select('created_by')");
  });

  it('attributes SCIM seat mutations to the authenticated token principal, not the target user', () => {
    expect(scim).toContain('actorUserId: input.authentication.actorUserId');
    expect(scim).toContain('actorUserId: authentication.actorUserId');
    expect(scim).not.toContain('actorUserId: input.identity.userId');
    expect(scim).not.toContain('actorUserId: identity.userId');
    expect(scim).not.toContain('actorUserId: userId,\n      role: input.role');
  });

  it('fails closed when the token principal cannot be resolved', () => {
    expect(scim).toContain("throw new ScimError('scim_authentication_unavailable', 503)");
    expect(scim).toContain('actorUserId: string;');
  });
});
