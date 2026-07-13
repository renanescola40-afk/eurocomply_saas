import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const checkerPath = path.join(rootDir, 'scripts/security/check-public-claims.mjs');
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function runCheckerForFixture(content: string) {
  const directory = fs.mkdtempSync(path.join(rootDir, '.public-claims-fixture-'));
  temporaryDirectories.push(directory);
  const fixturePath = path.join(directory, 'copy.ts');
  fs.writeFileSync(fixturePath, `${content}\n`);

  return spawnSync(process.execPath, [checkerPath], {
    cwd: rootDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      PUBLIC_CLAIMS_SCAN_TARGETS: path.relative(rootDir, fixturePath),
    },
  });
}

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
    expect(checker).toContain("'src/app/[locale]/enterprise/page.tsx'");
    expect(checker).toContain("'src/app/[locale]/retention-center/page.tsx'");
  });

  it('keeps activation and retention copy evidence-safe and on-brand', () => {
    const activationEmail = fs.readFileSync(path.join(rootDir, 'src/lib/email/activation-sequence.ts'), 'utf8');
    const retentionCenter = fs.readFileSync(path.join(rootDir, 'src/app/[locale]/retention-center/page.tsx'), 'utf8');

    expect(activationEmail).not.toContain('enterprise-ready compliance view');
    expect(activationEmail).toContain('structured compliance operations view for evidence preparation and internal review');

    expect(retentionCenter).not.toContain('EuroComply');
    expect(retentionCenter).not.toContain("enterpriseReady: 'Enterprise-ready'");
    expect(retentionCenter).not.toContain('signed retention-policy export');
    expect(retentionCenter).toContain('Ready for evidence review');
    expect(retentionCenter).toContain('RISCK COMPLY');
  });

  it('allows signed-contract language when an export is mentioned separately', () => {
    const result = runCheckerForFixture(
      "const copy = { title: 'Retention and deletion', description: 'Deletion posture should be confirmed in the signed agreement.', items: ['Workspace admins can request export or deletion support.'] };",
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Customer-facing claims: ok');
  });

  it('blocks actual signed retention-export claims', () => {
    const result = runCheckerForFixture("const copy = 'Download a signed retention-policy export for procurement review.';");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('possible unsupported signed retention export');
  });
});
