import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('platform administrator MFA contract', () => {
  const guard = read('src/server/security/platform-admin.ts');

  it('requires current-session aal2 after the platform role check', () => {
    const roleCheck = guard.indexOf("throw new PlatformAdminError('platform_admin_required', 403)");
    const assuranceCheck = guard.lastIndexOf('await requirePlatformAdminAal2()');

    expect(guard).toContain('createServerSupabaseClient()');
    expect(guard).toContain('getAuthenticatorAssuranceLevel');
    expect(guard).toContain("assurance.data?.currentLevel !== 'aal2'");
    expect(guard).toContain("PlatformAdminError('platform_admin_mfa_required', 403)");
    expect(guard).toContain("PlatformAdminError('platform_admin_mfa_check_failed', 503)");
    expect(roleCheck).toBeGreaterThan(-1);
    expect(assuranceCheck).toBeGreaterThan(roleCheck);
  });

  it('keeps every Sales Console read and mutation behind the shared guard', () => {
    for (const path of [
      'src/app/[locale]/admin/sales/leads/page.tsx',
      'src/app/[locale]/admin/sales/leads/[id]/page.tsx',
      'src/server/sales/lead-operations.ts',
    ]) {
      expect(read(path), path).toContain('requirePlatformAdmin(');
    }
  });
});
