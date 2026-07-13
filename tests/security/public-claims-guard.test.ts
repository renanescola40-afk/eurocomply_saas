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
  const fixturePath = path.join(directory, 'copy.tsx');
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

  it('covers every locale catalog and the full localized route tree', () => {
    const checker = fs.readFileSync(checkerPath, 'utf8');

    for (const locale of ['en', 'pt', 'es', 'fr', 'it', 'de']) {
      expect(fs.existsSync(path.join(rootDir, `src/messages/${locale}.json`))).toBe(true);
    }

    expect(checker).toContain("'src/messages'");
    expect(checker).toContain("'src/components/marketing'");
    expect(checker).toContain("'src/lib/email'");
    expect(checker).toContain("'src/lib/trust-center/content.ts'");
    expect(checker).toContain("'src/app/[locale]'");
    expect(checker).not.toContain("'src/app/[locale]/pricing/page.tsx'");
  });

  it('keeps corrected customer surfaces evidence-safe and on-brand', () => {
    const activationEmail = fs.readFileSync(path.join(rootDir, 'src/lib/email/activation-sequence.ts'), 'utf8');
    const retentionCenter = fs.readFileSync(path.join(rootDir, 'src/app/[locale]/retention-center/page.tsx'), 'utf8');
    const vendorAssurance = fs.readFileSync(path.join(rootDir, 'src/app/[locale]/vendor-assurance/page.tsx'), 'utf8');
    const enterpriseReadiness = fs.readFileSync(path.join(rootDir, 'src/app/[locale]/enterprise-readiness/page.tsx'), 'utf8');
    const passwordRecovery = fs.readFileSync(path.join(rootDir, 'src/app/[locale]/atualizar-senha/page.tsx'), 'utf8');

    expect(activationEmail).not.toContain('enterprise-ready compliance view');
    expect(activationEmail).toContain('structured compliance operations view for evidence preparation and internal review');

    for (const source of [retentionCenter, vendorAssurance, enterpriseReadiness, passwordRecovery]) {
      expect(source).not.toContain('EuroComply');
      expect(source).toContain('RISCK COMPLY');
    }

    expect(retentionCenter).not.toContain("enterpriseReady: 'Enterprise-ready'");
    expect(retentionCenter).not.toContain('signed retention-policy export');
    expect(retentionCenter).toContain('Ready for evidence review');

    expect(vendorAssurance).not.toContain('signed supplier assurance export');
    expect(vendorAssurance).toContain('structured supplier-assurance JSON export');

    expect(enterpriseReadiness).not.toContain('signed executive readiness export');
    expect(enterpriseReadiness).toContain('structured executive-readiness JSON export');
  });

  it('allows signed-contract language when an export is mentioned separately', () => {
    const result = runCheckerForFixture(
      "const copy = { title: 'Retention and deletion', description: 'Deletion posture should be confirmed in the signed agreement.', items: ['Workspace admins can request export or deletion support.'] };",
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Customer-facing claims: ok');
  });

  it('allows questions about professional involvement without treating them as claims', () => {
    const result = runCheckerForFixture("const question = 'Do you replace lawyers or DPOs?';");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Customer-facing claims: ok');
  });

  it('ignores technical headers, routes and legacy property keys', () => {
    const result = runCheckerForFixture(
      "const eurocomply = 'RISCK COMPLY'; const header = 'x-eurocomply-step-up-token'; const route = '/api/eurocomply/status';",
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Customer-facing claims: ok');
  });

  it('blocks legacy branding in visible JSX text', () => {
    const result = runCheckerForFixture('export function Page() { return <p>EuroComply</p>; }');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('possible legacy customer-facing brand');
  });

  it('blocks legacy branding inside multiline template literals', () => {
    const result = runCheckerForFixture("const report = `\nGenerated by EuroComply\n`;\n");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('possible legacy customer-facing brand');
  });

  it('blocks legacy branding in customer-visible download filenames', () => {
    const result = runCheckerForFixture("const filename = 'eurocomply-gap-analysis.txt';");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('possible legacy customer-facing brand');
  });

  it('blocks actual signed retention-export claims', () => {
    const result = runCheckerForFixture("const copy = 'Download a signed retention-policy export for procurement review.';");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('possible unsupported signed retention export');
  });
});
