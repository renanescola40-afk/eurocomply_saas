import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routeSource = () => readFileSync('src/app/api/leads/route.ts', 'utf8');

describe('public lead user-agent minimization', () => {
  it('stores and forwards only a derived user-agent identifier', () => {
    const source = routeSource();

    expect(source).toContain('hashRateLimitUserAgent');
    expect(source).toContain('function getPrivacySafeUserAgent(request: NextRequest)');
    expect(source).toContain('user_agent: getPrivacySafeUserAgent(request)');
    expect(source).not.toContain("user_agent: text(request.headers.get('user-agent'), 300)");
  });

  it('keeps a missing user-agent absent instead of hashing a placeholder', () => {
    const source = routeSource();

    expect(source).toContain("const userAgent = request.headers.get('user-agent')?.trim();");
    expect(source).toContain('return userAgent ? hashRateLimitUserAgent(userAgent) : null;');
  });
});
