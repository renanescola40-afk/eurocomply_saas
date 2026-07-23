import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('src/app/[locale]/dashboard/qualified-reviews/page.tsx', 'utf8');

describe('qualified review workspace UI', () => {
  it('renders all eight canonical review requirements', () => {
    for (const id of ['legal-rules','prohibited-practices','article-50-copy','fria-methodology','deployer-obligations','high-risk-provider','conformity','gpai']) {
      expect(page).toContain(id);
    }
  });

  it('shows exact-SHA, independence and evidence boundaries', () => {
    expect(page).toContain('Exact SHA');
    expect(page).toContain('Conflict check');
    expect(page).toContain('Evidence digest');
    expect(page).toContain('Independent approval');
    expect(page).toContain('not certification or regulator acceptance');
  });
});
