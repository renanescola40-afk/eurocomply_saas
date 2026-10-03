import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  new URL('../../src/server/queries/notifications.ts', import.meta.url),
  'utf8',
);

describe('notifications production schema contract', () => {
  it('persists only columns that exist in the current notifications table', () => {
    expect(source).toContain("title: input.title ?? null");
    expect(source).toContain("type: toPersistedNotificationType(input.type)");
    expect(source).toContain("message: input.message");
    expect(source).not.toContain("\n    metadata,\n");
  });

  it('does not silently add a database metadata field without a migration', () => {
    expect(source).toContain('void input.metadata;');
    expect(source).toContain('contract explicitly gains a metadata column');
  });
});
