import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const checkerPath = path.join(rootDir, 'scripts/security/check-public-claims.mjs');

describe('customer-facing claims guard', () => {
  it('passes against the current customer-facing copy surfaces', () => {
    const result = spawnSync(process.execPath, [checkerPath], {
      cwd: rootDir,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      throw new Error(`Claims guard failed:\n${result.stdout}\n${result.stderr}`);
    }

    expect(result.stdout).toContain('Customer-facing claims: ok');
  });

  it('is wired into the mandatory security CI gate', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['security:public-claims']).toBe('node scripts/security/check-public-claims.mjs');
    expect(packageJson.scripts['security:ci']).toContain('npm run security:public-claims');
  });

  it('covers every supported locale catalog and high-risk public surface', () => {
    const checker = fs.readFileSync(checkerPath, 'utf8');

    for (const locale of ['en', 'pt', 'es', 'fr', 'it', 'de']) {
      expect(fs.existsSync(path.join(rootDir, `src/messages/${locale}.json`))).toBe(true);
    }

    expect(checker).toContain("'src/messages'");
    expect(checker).toContain("'src/components/marketing'");
    expect(checker).toContain("'src/lib/email'");
    expect(checker).toContain("'src/lib/trust-center/content.ts'");
    expect(checker).toContain("'src/app/[locale]/pricing/page.tsx'");
  });
});
