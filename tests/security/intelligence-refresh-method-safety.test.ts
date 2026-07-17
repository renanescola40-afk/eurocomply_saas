import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/app/api/intelligence/refresh/route.ts'),
  'utf8',
);

describe('intelligence refresh method safety', () => {
  it('does not delegate GET requests to the state-changing POST handler', () => {
    expect(source).not.toContain('export async function GET(request: Request) {\n  return POST(request);\n}');
    expect(source).not.toMatch(/export async function GET[\s\S]*return POST\(/);
  });

  it('rejects GET with an explicit no-store 405 response and POST allow header', () => {
    expect(source).toContain("const METHOD_NOT_ALLOWED_HEADERS = { Allow: 'POST' };");
    expect(source).toContain("{ error: 'method_not_allowed' }");
    expect(source).toContain('status: 405');
    expect(source).toContain('headers: METHOD_NOT_ALLOWED_HEADERS');
    expect(source).toMatch(/export async function GET\(\) \{[\s\S]*noStoreJson/);
  });

  it('keeps authentication and rate limiting on the POST mutation path', () => {
    expect(source).toContain('enforceInternalAuthenticationRateLimit(request');
    expect(source).toContain('isAuthorizedInternalCronRequest(request)');
    expect(source).toMatch(/export async function POST\(request: Request\)[\s\S]*\.upsert\(/);
  });
});
