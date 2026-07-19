import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const actionPath = 'src/server/actions/auth-audit.ts';

describe('client auth audit fan-out persistence', () => {
  it('reports persistence only when every organization-scoped audit write persists', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain('result.length > 0 && result.every((entry) => entry.persisted)');
    expect(source).not.toContain('result.some((entry) => entry.persisted)');
  });

  it('does not report a complete chain when any required write is unpersisted or unchained', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain('const chained = persisted && result.every((entry) => entry.chained);');
    expect(source).not.toContain('result.some((entry) => entry.chained)');
  });

  it('preserves action allowlisting, authenticated success/logout events, and fail-closed rate limiting', () => {
    const source = readFileSync(actionPath, 'utf8');

    expect(source).toContain("const AUTH_ACTIONS = ['auth.login_success', 'auth.login_failure', 'auth.logout'] as const;");
    expect(source).toContain("input.action === 'auth.login_failure' ? null : await getCurrentUser()");
    expect(source).toContain("failureMode: 'fail-closed'");
    expect(source).toContain('const result = await recordAuthAuditEvent({');
  });
});
