import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  regions?: string[];
  git?: { deploymentEnabled?: Record<string, boolean> };
};

describe('Vercel production region affinity', () => {
  it('keeps server functions close to the Supabase EU production data plane', () => {
    expect(vercelConfig.regions).toEqual(['dub1']);
  });

  it('does not re-enable automatic Git deployments while the governed release path is in use', () => {
    expect(vercelConfig.git?.deploymentEnabled?.main).toBe(false);
    expect(vercelConfig.git?.deploymentEnabled?.['*']).toBe(false);
  });
});
