import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('Resend Production binding contract', () => {
  const workflow = read('.github/workflows/vercel-production.yml');
  const readyRoute = read('src/app/api/ready/route.ts');
  const sender = read('src/lib/email/server-sender.ts');

  it('keeps the official Production workflow fail-closed on Resend key and sender configuration', () => {
    expect(workflow).toContain("RESEND_API_KEY: ${{ secrets['RESEND_API_KEY'] }}");
    expect(workflow).toContain('EMAIL_FROM: ${{ vars.EMAIL_FROM }}');
    expect(workflow).toContain("REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY: 'true'");

    expect(workflow).toMatch(/required=\([\s\S]*\bRESEND_API_KEY\b[\s\S]*\bEMAIL_FROM\b[\s\S]*\bREQUIRE_TRANSACTIONAL_EMAIL_DELIVERY\b[\s\S]*\)/);
    expect(workflow).toMatch(/for key in \\\n[\s\S]*\bRESEND_API_KEY \\\n[\s\S]*do\n\s*sync_sensitive/);
    expect(workflow).toMatch(/for key in \\\n[\s\S]*\bEMAIL_FROM \\\n[\s\S]*\bREQUIRE_TRANSACTIONAL_EMAIL_DELIVERY \\\n[\s\S]*do\n\s*sync_public/);
  });

  it('requires the same provider pair in runtime readiness without exposing values', () => {
    expect(readyRoute).toContain("const REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY_ENV = 'REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY'");
    expect(readyRoute).toContain("hasConfiguredEnvValue('RESEND_API_KEY')");
    expect(readyRoute).toContain("hasConfiguredEnvValue('EMAIL_FROM')");
    expect(readyRoute).toContain('const transactionalEmail = transactionalEmailReadinessCheck();');
    expect(readyRoute).toContain('&& transactionalEmailConfigured;');
    expect(readyRoute).toContain('transactionalEmail,');
  });

  it('keeps the delivery implementation bound to Resend and the configured sender', () => {
    expect(sender).toContain("const RESEND_ENDPOINT = 'https://api.resend.com/emails'");
    expect(sender).toContain('const apiKey = process.env.RESEND_API_KEY;');
    expect(sender).toContain("return process.env.EMAIL_FROM ?? 'RISCK COMPLY <no-reply@risckcomply.app>';");
  });
});
