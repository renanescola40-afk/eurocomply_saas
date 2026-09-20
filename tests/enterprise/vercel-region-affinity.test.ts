import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  regions?: string[];
  git?: { deploymentEnabled?: boolean | Record<string, boolean> };
};

describe('Vercel production region affinity', () => {
  it('keeps server functions close to the Supabase EU production data plane', () => {
    expect(vercelConfig.regions).toEqual(['dub1']);
  });

  it('allows native Git deployment while Enterprise assurance remains independently governed', () => {
    expect(vercelConfig.git?.deploymentEnabled).toBe(true);
  });
});
