import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

function sliceBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `missing end marker: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe('Resend Production binding contract', () => {
  const workflow = read('.github/workflows/vercel-production.yml');
  const readyRoute = read('src/app/api/ready/route.ts');
  const sender = read('src/lib/email/server-sender.ts');

  it('keeps the official Production workflow fail-closed on Resend key and sender configuration', () => {
    expect(workflow).toContain("RESEND_API_KEY: ${{ secrets['RESEND_API_KEY'] }}");
    expect(workflow).toContain('EMAIL_FROM: ${{ vars.EMAIL_FROM }}');
    expect(workflow).toContain("REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY: 'true'");

    const requiredBlock = sliceBetween(workflow, 'required=(', 'missing=()');
    const sensitiveBlock = sliceBetween(workflow, 'for key in \\\n            SUPABASE_SERVICE_ROLE_KEY', 'do\n            sync_sensitive');
    const publicBlock = sliceBetween(workflow, 'for key in \\\n            NEXT_PUBLIC_SUPABASE_URL', 'do\n            sync_public');

    expect(requiredBlock).toContain('RESEND_API_KEY');
    expect(requiredBlock).toContain('EMAIL_FROM');
    expect(requiredBlock).toContain('REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY');
    expect(sensitiveBlock).toContain('RESEND_API_KEY');
    expect(publicBlock).toContain('EMAIL_FROM');
    expect(publicBlock).toContain('REQUIRE_TRANSACTIONAL_EMAIL_DELIVERY');
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
