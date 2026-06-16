import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 1 closeout command', () => {
  it('keeps the final closeout command wired and documented', () => {
    expect(existsSync('docs/PHASE1_CLOSEOUT_COMMAND.md')).toBe(true);

    const pkg = readFileSync('package.json', 'utf8');
    const doc = readFileSync('docs/PHASE1_CLOSEOUT_COMMAND.md', 'utf8');

    expect(pkg).toContain('phase1:closeout');
    expect(pkg).toContain('npm run phase1:evidence && npm run phase1:check');
    expect(doc).toContain('npm run phase1:closeout');
    expect(doc).toContain('real committed evidence');
  });
});
