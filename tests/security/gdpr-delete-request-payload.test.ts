import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const route = readFileSync(
  join(process.cwd(), 'src/app/api/gdpr/delete-request/route.ts'),
  'utf8',
);

describe('GDPR delete request payload invariants', () => {
  it('does not coerce bounded JSON reader failures into an empty object', () => {
    expect(route).not.toContain(".catch((): Record<string, unknown> => ({}))");
    expect(route).toContain('try {');
    expect(route).toContain("error: 'invalid_gdpr_delete_payload'");
    expect(route).toContain("reason: 'invalid_delete_request_payload'");
  });

  it('keeps invalid transport payloads distinct from missing confirmation', () => {
    const parseIndex = route.indexOf('readBoundedJsonRequest<Record<string, unknown>>');
    const invalidPayloadIndex = route.indexOf("error: 'invalid_gdpr_delete_payload'");
    const confirmationIndex = route.indexOf('validateDeleteConfirmation(body)');
    const requestedIndex = route.indexOf("action: 'gdpr_delete_requested'");
    const notificationIndex = route.indexOf('createNotification({');

    expect(parseIndex).toBeGreaterThan(-1);
    expect(invalidPayloadIndex).toBeGreaterThan(parseIndex);
    expect(confirmationIndex).toBeGreaterThan(invalidPayloadIndex);
    expect(requestedIndex).toBeGreaterThan(confirmationIndex);
    expect(notificationIndex).toBeGreaterThan(requestedIndex);
  });

  it('preserves bounded parsing and no-store error responses', () => {
    expect(route).toContain('maxBytes: DELETE_REQUEST_JSON_MAX_BYTES');
    expect(route).toContain('const DELETE_REQUEST_JSON_MAX_BYTES = 4 * 1024');
    expect(route).toMatch(/invalid_gdpr_delete_payload[\s\S]*status: 400/);
    expect(route).toContain('return noStoreJson({');
  });
});
