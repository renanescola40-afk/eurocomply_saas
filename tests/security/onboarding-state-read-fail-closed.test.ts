import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/server/queries/onboarding.ts', 'utf8');

describe('onboarding activation state read integrity', () => {
  it('requires the privileged Supabase client instead of returning a partial state when configuration is unavailable', () => {
    expect(source).toContain("import { createAdminClient } from '@/lib/supabase/admin';");
    expect(source).toContain('const supabase = createAdminClient();');
    expect(source).not.toContain('tryCreateAdminClient');
  });

  it('fails closed on unexpected organization, AI-system, and activation-run query errors', () => {
    expect(source.match(/throw new Error\('onboarding_state_unavailable'\);/g)).toHaveLength(3);
    expect(source).toContain("organizationError && !isExpectedSchemaFallback(organizationError)");
    expect(source).toContain("aiSystemError && !isExpectedSchemaFallback(aiSystemError)");
    expect(source).toContain("latestRunError && !isExpectedSchemaFallback(latestRunError)");
  });

  it('preserves explicit schema compatibility fallbacks and tenant scoping', () => {
    expect(source).toContain("error?.code === '42P01'");
    expect(source).toContain("error?.code === '42703'");
    expect(source).toContain("error?.code === 'PGRST204'");
    expect(source).toContain("error?.code === 'PGRST205'");
    expect(source.match(/\.eq\('organization_id', membership\.organization_id\)/g)).toHaveLength(2);
    expect(source).toContain(".eq('id', membership.organization_id)");
  });

  it('logs only sanitized provider error codes', () => {
    expect(source).toContain("{ code: organizationError.code ?? 'unknown' }");
    expect(source).toContain("{ code: aiSystemError.code ?? 'unknown' }");
    expect(source).toContain("{ code: latestRunError.code ?? 'unknown' }");
    expect(source).not.toContain('organizationError.message');
    expect(source).not.toContain('aiSystemError.message');
    expect(source).not.toContain('latestRunError.message');
  });
});
