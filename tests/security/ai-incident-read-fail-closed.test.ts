import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const QUERY_FILE = new URL('../../src/server/queries/ai-incidents.ts', import.meta.url);

describe('AI incident register read failure contract', () => {
  it('requires the admin client for incident reads', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const incidentRead = source.slice(
      source.indexOf('export async function listAiIncidents'),
      source.indexOf('export async function createAiIncident'),
    );

    expect(source).not.toContain('tryCreateAdminClient');
    expect(incidentRead).toContain('const supabase = createAdminClient();');
  });

  it('does not convert incident read failures into an empty governance register', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const incidentRead = source.slice(
      source.indexOf('export async function listAiIncidents'),
      source.indexOf('export async function createAiIncident'),
    );

    expect(incidentRead).toContain("console.warn('[ai-incidents] list_failed'");
    expect(incidentRead).toContain("throw new Error('Unable to load AI incidents.');");
    expect(incidentRead).not.toContain('throw error;');
    expect(incidentRead).not.toContain('return [];');
  });

  it('preserves tenant scoping and deterministic incident ordering', async () => {
    const source = await readFile(QUERY_FILE, 'utf8');
    const incidentRead = source.slice(
      source.indexOf('export async function listAiIncidents'),
      source.indexOf('export async function createAiIncident'),
    );

    expect(incidentRead).toContain(".eq('organization_id', organizationId)");
    expect(incidentRead).toContain(".order('detected_at', { ascending: false })");
    expect(incidentRead).toContain('return (data ?? []) as unknown as AiIncidentRecord[];');
  });
});
