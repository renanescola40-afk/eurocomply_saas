import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const SHELL = new URL('../../src/components/dashboard/enterprise-dashboard-shell.tsx', import.meta.url);
const FRIA = new URL('../../src/app/[locale]/dashboard/fria/page.tsx', import.meta.url);
const CONTROL_TOWER = new URL('../../src/app/[locale]/dashboard/regulatory-control-tower/page.tsx', import.meta.url);
const AI_LITERACY = new URL('../../src/app/[locale]/dashboard/ai-literacy/page.tsx', import.meta.url);
const INTELLIGENCE = new URL('../../src/app/[locale]/dashboard/organizations/reports-governance/news/page.tsx', import.meta.url);
const INTELLIGENCE_DETAIL = new URL('../../src/app/[locale]/dashboard/organizations/reports-governance/news/[id]/page.tsx', import.meta.url);
const INTELLIGENCE_EDITORIAL = new URL('../../src/app/[locale]/dashboard/organizations/reports-governance/news/editorial/page.tsx', import.meta.url);

describe('TailAdmin phase 5 final dashboard closure', () => {
  it('routes the enterprise navigation to the canonical governance workspaces', async () => {
    const source = await readFile(SHELL, 'utf8');

    expect(source).toContain("href: localized(locale, '/dashboard/fria')");
    expect(source).toContain("href: localized(locale, '/dashboard/regulatory-control-tower')");
    expect(source).toContain("href: localized(locale, '/dashboard/ai-literacy')");
    expect(source).toContain("href: localized(locale, '/dashboard/evidence')");
    expect(source).toContain("href: localized(locale, '/dashboard/organizations/reports-governance/news')");
    expect(source).not.toContain("href: localized(locale, '/dashboard/organizations/regulatory-control-tower')");
    expect(source).not.toContain("href: localized(locale, '/dashboard/organizations/ai-literacy')");
  });

  it('closes the remaining canonical governance pages onto the shared graphite canvas', async () => {
    const sources = await Promise.all([
      readFile(FRIA, 'utf8'),
      readFile(CONTROL_TOWER, 'utf8'),
      readFile(AI_LITERACY, 'utf8'),
      readFile(INTELLIGENCE, 'utf8'),
      readFile(INTELLIGENCE_DETAIL, 'utf8'),
      readFile(INTELLIGENCE_EDITORIAL, 'utf8'),
    ]);

    for (const source of sources) {
      expect(source).toContain('min-h-0 bg-transparent text-white');
      expect(source).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');
      expect(source).not.toContain('radial-gradient');
      expect(source).not.toContain('rounded-[2rem]');
      expect(source).not.toContain('shadow-2xl');
      expect(source).not.toContain('blur-3xl');
      expect(source).not.toContain('Sparkles');
    }
  });

  it('preserves authoritative FRIA, literacy and control-tower workflows while removing generic Card composition', async () => {
    const [fria, literacy, controlTower] = await Promise.all([
      readFile(FRIA, 'utf8'),
      readFile(AI_LITERACY, 'utf8'),
      readFile(CONTROL_TOWER, 'utf8'),
    ]);

    expect(fria).toContain("roleHasPermission(snapshot?.role, 'manage_ai_governance')");
    expect(fria).toContain("run('assessment_create'");
    expect(fria).toContain("run('assessment_update'");
    expect(fria).toContain("run('assessment_approve'");
    expect(fria).toContain("run('evidence_submit'");
    expect(fria).not.toContain("from '@/components/ui/card'");
    expect(fria).not.toContain('focus-visible:ring-violet');

    for (const workflow of ['program_create', 'program_activate', 'course_create', 'course_publish', 'assignment_create', 'assignment_complete', 'evidence_submit', 'evidence_review']) {
      expect(literacy).toContain(`'${workflow}'`);
    }
    expect(literacy).not.toContain("from '@/components/ui/card'");
    expect(literacy).not.toContain('violet-');

    expect(controlTower).toContain("fetch('/api/ai-governance/regulatory-control-tower'");
    expect(controlTower).toContain('snapshot.activationPercent');
    expect(controlTower).toContain('snapshot.readyPercent');
    expect(controlTower).not.toContain("from '@/components/ui/card'");
    expect(controlTower).not.toContain("from '@/components/ui/progress'");
  });

  it('keeps regulatory intelligence grounded in published source-verifiable records', async () => {
    const [list, detail, editorial] = await Promise.all([
      readFile(INTELLIGENCE, 'utf8'),
      readFile(INTELLIGENCE_DETAIL, 'utf8'),
      readFile(INTELLIGENCE_EDITORIAL, 'utf8'),
    ]);

    expect(list).toContain('listPublishedIntelligenceItems()');
    expect(list).toContain("canAccessFeature('regulatory_monitoring'");
    expect(list).toContain('Only published items with a real publication date and an HTTPS reference');
    expect(detail).toContain('getPublishedIntelligenceItem(id)');
    expect(detail).toContain('item.sourceUrl');
    expect(detail).toContain('item.contentRights');
    expect(editorial).toContain('listPublishedIntelligenceItems()');
    expect(editorial).toContain("isPlanAtLeast(entitlements.plan, 'professional')");
  });
});
