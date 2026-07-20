import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const action = readFileSync('src/server/actions/invitations.ts', 'utf8');
const helper = readFileSync('src/server/security/server-action-rate-limit.ts', 'utf8');

describe('invitation acceptance distributed rate-limit boundary', () => {
  it('uses the high-risk team policy before the atomic acceptance RPC', () => {
    const limiter = action.indexOf('await enforceServerActionRateLimit({');
    const rpc = action.indexOf("supabase.rpc(ATOMIC_INVITATION_ACCEPTANCE_RPC");

    expect(limiter).toBeGreaterThan(0);
    expect(limiter).toBeLessThan(rpc);
    expect(action).toContain("policy: 'team-management'");
    expect(action).toContain("failureMode: 'fail-closed'");
    expect(action).toContain("route: 'server-action:acceptInvitation'");
  });

  it('never derives the limiter key or audit metadata from the raw invitation token', () => {
    const limiter = action.slice(
      action.indexOf('await enforceServerActionRateLimit({'),
      action.indexOf('});', action.indexOf('await enforceServerActionRateLimit({')) + 3,
    );

    expect(limiter).toContain('user.id');
    expect(limiter).not.toContain('payload.token');
    expect(helper).not.toContain('key: result.key');
    expect(helper).not.toContain('metadata: { key:');
  });

  it('separates backend unavailability from rate-limit abuse and audits blocked decisions', () => {
    expect(helper).toContain("'security_control_unavailable'");
    expect(helper).toContain("'rate_limited'");
    expect(helper).toContain('await auditServerActionBlock(result)');
    expect(helper).toContain("action: result.highRisk ? 'high_risk_rate_limit_blocked' : 'rate_limit_blocked'");
  });
});
