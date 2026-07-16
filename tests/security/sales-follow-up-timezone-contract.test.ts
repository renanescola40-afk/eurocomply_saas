import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const action = fs.readFileSync('src/server/sales/lead-operations.ts', 'utf8');
const page = fs.readFileSync('src/app/[locale]/admin/sales/leads/[id]/page.tsx', 'utf8');

describe('Sales Console follow-up timezone contract', () => {
  it('parses datetime-local input with UTC primitives instead of the server timezone', () => {
    expect(action).toContain('Date.UTC(year, month - 1, day, hour, minute)');
    expect(action).toContain('date.getUTCFullYear() !== year');
    expect(action).not.toContain('new Date(normalized)');
  });

  it('communicates the UTC contract and labels the input explicitly', () => {
    expect(page).toContain('Next follow-up (UTC)');
    expect(page).toContain('htmlFor="next-follow-up-at"');
    expect(page).toContain('id="next-follow-up-at"');
  });
});
