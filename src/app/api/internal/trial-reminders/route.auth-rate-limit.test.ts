import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(new URL('./route.ts', import.meta.url), 'utf8');

describe('trial reminder authentication rate limit', () => {
  it('applies the shared fail-closed authentication limiter before credential validation', () => {
    const limiterIndex = routeSource.indexOf('await enforceInternalAuthenticationRateLimit(request, {');
    const authorizationIndex = routeSource.indexOf('if (!isAuthorizedInternalCronRequest(request))');
    const jobIndex = routeSource.indexOf('const reminders = await sendTrialReminders();');

    expect(routeSource).toContain("const TRIAL_REMINDER_ROUTE = '/api/internal/trial-reminders';");
    expect(routeSource).toContain("const TRIAL_REMINDER_AUTH_ACTION = 'authenticate_trial_reminder_job';");
    expect(routeSource).toContain('route: TRIAL_REMINDER_ROUTE');
    expect(routeSource).toContain('action: TRIAL_REMINDER_AUTH_ACTION');
    expect(routeSource).toContain('if (authRateLimited) return authRateLimited;');

    expect(limiterIndex).toBeGreaterThan(-1);
    expect(authorizationIndex).toBeGreaterThan(limiterIndex);
    expect(jobIndex).toBeGreaterThan(authorizationIndex);
  });
});
