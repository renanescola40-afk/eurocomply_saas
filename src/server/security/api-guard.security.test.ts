import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const guardSource = readFileSync(join(process.cwd(), 'src/server/security/api-guards.ts'), 'utf8');
const canonicalGuardSource = readFileSync(join(process.cwd(), 'src/server/security/api-guard.ts'), 'utf8');
const inventorySource = readFileSync(join(process.cwd(), 'docs/security/API_ROUTE_INVENTORY.md'), 'utf8');
const hardeningScriptSource = readFileSync(join(process.cwd(), 'scripts/security/check-api-route-hardening.mjs'), 'utf8');
const bolaScriptSource = readFileSync(join(process.cwd(), 'scripts/security/check-authorization-bola.mjs'), 'utf8');

describe('central API guard security contract', () => {
  it('exposes the required enterprise API guard helpers', () => {
    for (const helper of [
      'requireApiUser',
      'requireOrganizationContext',
      'requireOrganizationMembership',
      'requirePermission',
      'requireRateLimit',
      'parseJsonBodyWithZod',
    ]) {
      expect(guardSource).toContain(`export async function ${helper}`);
    }

    for (const helper of ['requireTrustedOriginForMutation', 'secureApiError', 'secureApiJson']) {
      expect(guardSource).toContain(`export function ${helper}`);
    }
  });

  it('keeps the canonical singular helper path compatible with existing plural imports', () => {
    expect(canonicalGuardSource).toContain("export * from './api-guards'");
  });

  it('parses API JSON through the bounded reader instead of raw request.json()', () => {
    expect(guardSource).toContain('readBoundedJsonRequest');
    expect(guardSource).toContain('DEFAULT_JSON_BODY_MAX_BYTES');
    expect(guardSource).toContain('ValidationError');
    expect(guardSource).not.toContain('request.json()');
  });

  it('sanitizes auth, membership, validation, and internal error responses', () => {
    expect(guardSource).toContain("code: 'unauthorized'");
    expect(guardSource).toContain("code: 'organization_membership_required'");
    expect(guardSource).toContain("error: 'invalid_request'");
    expect(guardSource).toContain("error: 'internal_server_error'");
    expect(guardSource).not.toMatch(/error\.stack|stack:\s*error|JSON\.stringify\(\s*error/);
  });

  it('documents the BOLA/IDOR and webhook negative-test invariants', () => {
    for (const expected of [
      'unauthenticated requests return 401',
      'missing membership returns 403',
      'viewer attempting admin mutation returns 403',
      'tenant A attempting tenant B resource access returns 403/404',
      'invalid origin returns 403',
      'invalid body returns 400',
      'internal errors return sanitized responses without stack traces',
      'legitimate signed webhooks continue to pass',
    ]) {
      expect(inventorySource).toContain(expected);
    }
  });

  it('fails CI when route inventory or BOLA checks find gaps', () => {
    expect(hardeningScriptSource).toContain('missing explicit inventory classification');
    expect(hardeningScriptSource).toContain('process.exit(1)');
    expect(bolaScriptSource).not.toContain('report-only mode');
    expect(bolaScriptSource).toContain('process.exitCode = 1');
  });
});
