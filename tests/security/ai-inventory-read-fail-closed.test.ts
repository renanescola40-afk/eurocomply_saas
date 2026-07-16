import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/ai-systems.ts', import.meta.url);

describe('AI inventory read failure contract', () => {
  it('uses the required admin client for inventory and history reads', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).not.toContain('tryCreateAdminClient');
    expect(source.match(/const supabase = createAdminClient\(\);/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('does not convert database read failures into empty governance records', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    const inventoryRead = source.slice(
      source.indexOf('export async function listAiSystems'),
      source.indexOf('export async function getAiSystem'),
    );
    const historyRead = source.slice(
      source.indexOf('export async function listAiSystemHistory'),
      source.indexOf('export async function createAiSystem'),
    );

    expect(inventoryRead).toContain("console.warn('[ai-systems] list_failed'");
    expect(inventoryRead).toContain('throw error;');
    expect(inventoryRead).not.toContain('return [];');

    expect(historyRead).toContain("console.warn('[ai-systems] history_list_failed'");
    expect(historyRead).toContain('throw error;');
    expect(historyRead).not.toContain('return [];');
  });
});
