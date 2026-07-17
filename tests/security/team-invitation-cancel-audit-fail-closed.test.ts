import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routePath = 'src/app/api/team/invitations/cancel/route.ts';

describe('team invitation cancellation audit persistence', () => {
  it('does not report cancellation success without durable audit evidence', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain('const audit = await createAuditEvent({');
    expect(source).toContain('if (!audit.persisted)');
    expect(source).toContain("return noStoreJson({ error: 'team_invitation_cancel_audit_unavailable' }, { status: 503 });");

    const auditGuardIndex = source.indexOf('if (!audit.persisted)');
    const successResponseIndex = source.indexOf('auditPersisted: true');

    expect(auditGuardIndex).toBeGreaterThan(-1);
    expect(successResponseIndex).toBeGreaterThan(auditGuardIndex);
    expect(source).not.toContain('auditPersisted: audit.persisted');
  });

  it('attempts to restore the exact pending invitation after audit persistence fails', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("await supabase.from('invitations').insert({");
    expect(source).toContain('id: invitation.id');
    expect(source).toContain('organization_id: invitation.organization_id');
    expect(source).toContain('token: invitation.token');
    expect(source).toContain('invited_by: invitation.invited_by');
    expect(source).toContain('expires_at: invitation.expires_at');
    expect(source).toContain("area: 'team_invitation_cancel_audit_rollback'");
  });

  it('preserves tenant, permission, mutation, rate-limit, step-up, and pending-state controls', () => {
    const source = readFileSync(routePath, 'utf8');

    expect(source).toContain("permission: 'manage_team'");
    expect(source).toContain('requireTrustedMutation(request');
    expect(source).toContain('requireStepUpForRequest({');
    expect(source).toContain(".eq('organization_id', organization.id)");
    expect(source).toContain(".is('accepted_at', null)");
    expect(source).toContain('limit: RATE_LIMIT_MAX_ATTEMPTS');
    expect(source).toContain("failureMode: 'fail-closed'");
  });
});
