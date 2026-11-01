import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflows = [
  '.github/workflows/audit-chain-runtime-proof.yml',
  '.github/workflows/production-runtime-proof.yml',
  '.github/workflows/production-provider-runtime-proof.yml',
];

describe('protected runtime proof exact-main authentication', () => {
  for (const path of workflows) {
    const workflow = readFileSync(path, 'utf8');

    it(`${path} uses authenticated GitHub API lookup and preserves exact-SHA fail-closed binding`, () => {
      expect(workflow).toContain('GITHUB_TOKEN: ${{ github.token }}');
      expect(workflow).toContain('Authorization: Bearer $GITHUB_TOKEN');
      expect(workflow).toContain('$GITHUB_API_URL/repos/$GITHUB_REPOSITORY/commits/main');
      expect(workflow).toContain('jq -er');
      expect(workflow).toContain('test "$main_sha" = "$TARGET_SHA"');
      expect(workflow).not.toContain('git ls-remote');
    });
  }
});
