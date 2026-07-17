import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const route = readFileSync('src/app/api/gdpr/export/route.ts', 'utf8');

function sourceBetween(start: string, end: string) {
  const startIndex = route.indexOf(start);
  const endIndex = route.indexOf(end, startIndex + start.length);

  expect(startIndex, start).toBeGreaterThanOrEqual(0);
  expect(endIndex, end).toBeGreaterThan(startIndex);

  return route.slice(startIndex, endIndex);
}

describe('GDPR export completeness boundary', () => {
  it('fails closed before a download when any inventory table is unavailable', () => {
    expect(route).toContain('if (exportBody.unavailableTables.length > 0)');
    expect(route).toContain("return noStoreJson({ error: 'gdpr_export_incomplete' }, { status: 503 });");

    const incompleteBoundary = sourceBetween(
      'if (exportBody.unavailableTables.length > 0)',
      "action: 'gdpr_export_requested'",
    );

    expect(incompleteBoundary).toContain("action: 'gdpr_export_failed'");
    expect(incompleteBoundary).not.toContain('noStoreDownload');
    expect(incompleteBoundary).not.toContain('createNotification');
  });

  it('keeps success audit and notification after the completeness boundary', () => {
    const completenessIndex = route.indexOf('if (exportBody.unavailableTables.length > 0)');
    const successAuditIndex = route.indexOf("action: 'gdpr_export_requested'");
    const notificationIndex = route.indexOf('await createNotification');
    const downloadIndex = route.indexOf('return noStoreDownload');

    expect(successAuditIndex).toBeGreaterThan(completenessIndex);
    expect(notificationIndex).toBeGreaterThan(successAuditIndex);
    expect(downloadIndex).toBeGreaterThan(notificationIndex);
  });
});
