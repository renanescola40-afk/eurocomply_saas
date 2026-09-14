import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = join(process.cwd(), 'src/lib/analytics/posthog-server.ts');

describe('server analytics consent boundary', () => {
  it('requires deployment opt-in and explicit consent before any capture', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source).toContain("process.env.POSTHOG_SERVER_CAPTURE_ENABLED === 'true'");
    expect(source).toContain('input.analyticsConsent !== true');
    expect(source).toContain('if (!serverCaptureEnabled || input.analyticsConsent !== true');
  });
});
