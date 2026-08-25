import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const ASSIGNEES_FILE = new URL('../../src/server/ai-governance/fria-assignees.ts', import.meta.url);
const FRIA_ROUTE_FILE = new URL('../../src/app/api/ai-governance/fria/route.ts', import.meta.url);

describe('FRIA active assignee boundary', () => {
  it('lists only active organization members as FRIA assignee candidates', async () => {
    const source = await readFile(ASSIGNEES_FILE, 'utf8');
    const candidateRead = source.slice(
      source.indexOf('export async function listFriaAssigneeCandidates'),
      source.indexOf('export async function validateFriaAssignmentMembers'),
    );

    expect(candidateRead).toContain(".eq('organization_id', input.organizationId)");
    expect(candidateRead).toContain(".eq('status', 'active')");
    expect(candidateRead.indexOf(".eq('status', 'active')")).toBeGreaterThan(
      candidateRead.indexOf(".eq('organization_id', input.organizationId)"),
    );
    expect(candidateRead.indexOf(".eq('status', 'active')")).toBeLessThan(
      candidateRead.indexOf(".not('user_id', 'is', null)"),
    );
  });

  it('rejects suspended or inactive members during FRIA assignment validation', async () => {
    const source = await readFile(ASSIGNEES_FILE, 'utf8');
    const validationRead = source.slice(
      source.indexOf('export async function validateFriaAssignmentMembers'),
    );

    expect(validationRead).toContain(".eq('organization_id', input.organizationId)");
    expect(validationRead).toContain(".eq('status', 'active')");
    expect(validationRead).toContain(".in('user_id', assignedIds)");
    expect(validationRead.indexOf(".eq('status', 'active')")).toBeGreaterThan(
      validationRead.indexOf(".eq('organization_id', input.organizationId)"),
    );
    expect(validationRead.indexOf(".eq('status', 'active')")).toBeLessThan(
      validationRead.indexOf(".in('user_id', assignedIds)"),
    );
    expect(validationRead).toContain("return { ok: false, error: 'fria_assignee_not_eligible', field };");
  });

  it('keeps both candidate and validation membership reads active-status scoped', async () => {
    const source = await readFile(ASSIGNEES_FILE, 'utf8');
    expect(source.match(/\.eq\('status', 'active'\)/g)).toHaveLength(2);
  });

  it('keeps the API mutation path bound to server-side assignment validation', async () => {
    const route = await readFile(FRIA_ROUTE_FILE, 'utf8');
    expect(route).toContain('const assignmentValidation = await validateFriaAssignmentMembers({');
    expect(route).toContain("assignmentValidation.error === 'fria_assignee_not_eligible'");
  });
});
