import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(
  'src/app/[locale]/dashboard/transparencia/page.tsx',
  'utf8',
);
const workspace = readFileSync(
  'src/components/ai-governance/article-50-workspace.tsx',
  'utf8',
);
const route = readFileSync(
  'src/app/api/ai-governance/article-50/route.ts',
  'utf8',
);

describe('Article 50 operational UI contract', () => {
  it('uses the hardened workspace instead of browser-local persistence', () => {
    expect(page).toContain('Article50Workspace');
    expect(page).not.toContain('localStorage');
    expect(page).not.toContain('supabase');
    expect(workspace).not.toContain('localStorage');
    expect(workspace).not.toContain("from '@/integrations/supabase/client'");
  });

  it('loads and mutates only through the protected Article 50 API', () => {
    expect(workspace).toContain("fetch('/api/ai-governance/article-50'");
    expect(workspace).toContain(
      "fetch('/api/ai-governance/article-50?workflow=assessment_create'",
    );
    expect(workspace).toContain(
      "fetch('/api/ai-governance/article-50?workflow=evidence_submit'",
    );
    expect(workspace).toContain("cache: 'no-store'");
    expect(workspace).toContain("credentials: 'same-origin'");
  });

  it('shows separate provider and deployer controls', () => {
    expect(workspace).toContain('Provider: marcação machine-readable');
    expect(workspace).toContain('Deployer: aviso human-readable');
    expect(workspace).toContain("obligation: 'article_50_2_machine_readable_marking'");
    expect(workspace).toContain("obligation: 'article_50_4_deployer_disclosure'");
  });

  it('exposes blocked, review and ready states without certification claims', () => {
    expect(workspace).toContain("'BLOCKED' | 'NEEDS_REVIEW' | 'READY'");
    expect(workspace).toContain('workspace.truthBoundary');
    expect(route).toContain('Workflow readiness is not legal certification');
    expect(workspace.toLowerCase()).not.toContain('fully compliant');
    expect(workspace.toLowerCase()).not.toContain('guaranteed compliance');
  });

  it('retains exact disclosure, display and marking evidence references', () => {
    expect(workspace).toContain('disclosureCopy');
    expect(workspace).toContain('displayEvidenceReference');
    expect(workspace).toContain('markingEvidenceReference');
    expect(workspace).toContain('sha256Digest');
    expect(workspace).toContain('validUntil');
  });
});
