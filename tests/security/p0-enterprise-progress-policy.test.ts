import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const progressScript = readFileSync('scripts/security/write-p0-enterprise-progress.mjs', 'utf8');
const releaseChecklist = readFileSync('docs/RELEASE_EVIDENCE_CHECKLIST.md', 'utf8');

describe('P0 enterprise progress policy detection', () => {
  it('detects the canonical live RLS release policy instead of legacy prose', () => {
    expect(releaseChecklist).toContain('`npm run security:rls:live`');
    expect(releaseChecklist).toContain('`supabase-live-rls-validation.json`');
    expect(progressScript).toContain("fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', '`supabase-live-rls-validation.json`')");
    expect(progressScript).toContain("fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', '`npm run security:rls:live`')");
    expect(progressScript).not.toContain('Live RLS validation completed against the target Supabase project');
  });

  it('detects the canonical external-review release policy instead of legacy prose', () => {
    expect(releaseChecklist).toContain('| External review evidence |');
    expect(releaseChecklist).toContain('`external-security-review-or-pentest.json`');
    expect(progressScript).toContain("fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', '`external-security-review-or-pentest.json`')");
    expect(progressScript).toContain("fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', 'External review evidence')");
    expect(progressScript).not.toContain("done: fileIncludes('docs/RELEASE_EVIDENCE_CHECKLIST.md', 'External security review or pentest completed')");
  });

  it('does not promote runtime evidence from policy presence', () => {
    expect(progressScript).toContain("'| Branch protection applied on `main` | Complete |'");
    expect(progressScript).toContain("'| Required status checks configured | Complete |'");
    expect(progressScript).toContain("'| Production secrets configured in provider secret stores | Complete |'");
    expect(progressScript).toContain("'| Supabase live RLS validation completed | Complete |'");
    expect(progressScript).toContain("'| External security review or pentest completed | Complete |'");
  });
});
