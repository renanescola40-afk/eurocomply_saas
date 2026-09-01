import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('auth recovery UI V2', () => {
  it('keeps enterprise SSO authority while using cobalt auth chrome', () => {
    const source = read('src/components/auth/enterprise-sso-login.tsx');

    expect(source).toContain('supabase.auth.signInWithSSO');
    expect(source).toContain("domain.length > 253");
    expect(source).toContain("window.location.assign(data.url)");
    expect(source).toContain('border-blue-400/15');
    expect(source).not.toContain('cyan-');
  });

  it('uses the official wordmark on account recovery and preserves the recovery API contract', () => {
    const source = read('src/app/[locale]/recuperar-senha/page.tsx');

    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain("fetch('/api/auth/recovery'");
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("body: JSON.stringify({ email: normalizedEmail, locale })");
    expect(source).toContain('bg-blue-600');
    expect(source).not.toContain('cyan-');
  });

  it('uses the official wordmark on password reset and preserves Supabase recovery-session authority', () => {
    const source = read('src/app/[locale]/reset-password/page.tsx');

    expect(source).toContain('/brand/risck-comply-wordmark.svg');
    expect(source).toContain('supabase.auth.getSession()');
    expect(source).toContain('supabase.auth.onAuthStateChange');
    expect(source).toContain('supabase.auth.updateUser({ password })');
    expect(source).toContain('supabase.auth.signOut()');
    expect(source).toContain('bg-blue-600');
    expect(source).not.toContain('cyan-');
  });
});