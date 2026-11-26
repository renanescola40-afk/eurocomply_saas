import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/ai-systems.ts', import.meta.url);

describe('AI inventory read failure contract', () => {
  it('uses authenticated QA reads and retains the required admin client outside QA', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');

    expect(source).not.toContain('tryCreateAdminClient');
    expect(source.match(/const supabase = isQaInventory\(\) \? await createServerSupabaseClient\(\) : createAdminClient\(\);/g)?.length).toBe(3);
    expect(source).toContain("return process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://zrxrrfbllsxtleyxjpsz.supabase.co'");
  });

  it('does not convert database read failures into empty governance records or expose provider errors', async () => {
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
    expect(inventoryRead).toContain("throw new Error('Unable to load AI systems.');");
    expect(inventoryRead).not.toContain('throw error;');
    expect(inventoryRead).not.toContain('return [];');

    expect(historyRead).toContain("console.warn('[ai-systems] history_list_failed'");
    expect(historyRead).toContain("throw new Error('Unable to load AI system history.');");
    expect(historyRead).not.toContain('throw error;');
    expect(historyRead).not.toContain('return [];');
  });
});
