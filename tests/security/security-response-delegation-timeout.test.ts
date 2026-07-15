import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('scripts/security/check-security-responses.mjs', 'utf8');

describe('security response delegated-check runtime bound', () => {
  it('fails closed when a delegated security check hangs or is terminated', () => {
    expect(source).toContain('DELEGATED_CHECK_TIMEOUT_MS');
    expect(source).toContain('timeout: DELEGATED_CHECK_TIMEOUT_MS');
    expect(source).toContain("killSignal: 'SIGTERM'");
    expect(source).toContain("result.error.code === 'ETIMEDOUT'");
    expect(source).toContain('result.signal');
    expect(source).toContain('exceeded the ${DELEGATED_CHECK_TIMEOUT_MS}ms delegated-check timeout');
  });

  it('does not treat timed-out or signalled checks as successful', () => {
    const errorGuard = source.indexOf('if (result.error)');
    const signalGuard = source.indexOf('if (result.signal)');
    const successStatusGuard = source.indexOf('if (result.status !== 0)');

    expect(errorGuard).toBeGreaterThan(-1);
    expect(signalGuard).toBeGreaterThan(errorGuard);
    expect(successStatusGuard).toBeGreaterThan(signalGuard);
  });
});
