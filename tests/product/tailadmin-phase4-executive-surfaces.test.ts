import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const OVERVIEW = new URL('../../src/components/dashboard/dashboard-overview.tsx', import.meta.url);
const EXPERIENCE_MAP = new URL('../../src/components/dashboard/dashboard-experience-map.tsx', import.meta.url);
const EXPERIENCE_INDEX = new URL('../../src/components/dashboard/dashboard-experience-index.tsx', import.meta.url);
const EXECUTIVE_HERO = new URL('../../src/components/dashboard/executive-dashboard-hero.tsx', import.meta.url);
const EXECUTIVE_COMMAND_CENTER = new URL('../../src/components/dashboard/executive-command-center.tsx', import.meta.url);
const EXECUTIVE_KPI = new URL('../../src/components/dashboard/sticky-executive-kpi-bar.tsx', import.meta.url);
const EXECUTIVE_COCKPIT = new URL('../../src/components/dashboard/executive-cockpit.tsx', import.meta.url);
const GOVERNANCE_ASSISTANT = new URL('../../src/components/dashboard/ai-copilot-panel.tsx', import.meta.url);
const ACTIVITY_FEED = new URL('../../src/components/dashboard/operational-activity-feed.tsx', import.meta.url);
const RISK_HEATMAP = new URL('../../src/components/dashboard/risk-heatmap.tsx', import.meta.url);
const RELATIONSHIP_GRAPH = new URL('../../src/components/dashboard/relationship-graph.tsx', import.meta.url);
const EVIDENCE_GRAPH = new URL('../../src/components/dashboard/evidence-graph.tsx', import.meta.url);
const BOARD_MODE = new URL('../../src/components/dashboard/board-mode-preview.tsx', import.meta.url);
const REMEDIATION_PLANNER = new URL('../../src/components/dashboard/scenario-simulator.tsx', import.meta.url);

describe('TailAdmin phase 4 executive surfaces', () => {
  it('removes synthetic enterprise preview metrics from the dashboard overview', async () => {
    const source = await readFile(OVERVIEW, 'utf8');

    expect(source).not.toContain('EnterpriseMetricsPreview');
    expect(source).not.toContain('Enterprise Diamond');
    expect(source).not.toContain('Priority support signal');
    expect(source).not.toContain("from '@/components/ui/card'");
    expect(source).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');
    expect(source).toContain('divide-y divide-white/[0.055]');
  });

  it('uses real workspace routes instead of stale one-page experience anchors', async () => {
    const source = await readFile(EXPERIENCE_MAP, 'utf8');

    expect(source).toContain('Workspace map');
    expect(source).toContain("href: `${basePath}/tasks`");
    expect(source).toContain("href: `${basePath}/evidence-risk`");
    expect(source).toContain("href: `${basePath}/reports-governance`");
    expect(source).toContain("href: `${basePath}/team`");
    expect(source).not.toContain("anchor: '#executive-cockpit'");
    expect(source).not.toContain("anchor: '#evidence-graph'");
    expect(source).not.toContain('Expand revenue');
    expect(source).not.toContain('rounded-[2rem]');
    expect(source).not.toContain('hover:-translate-y');
  });

  it('keeps the operating index factual and removes enterprise-readiness overclaims', async () => {
    const source = await readFile(EXPERIENCE_INDEX, 'utf8');

    expect(source).toContain('Operating index');
    expect(source).toContain('Strong operating posture');
    expect(source).not.toContain('Enterprise review-ready');
    expect(source).not.toContain('blur-3xl');
    expect(source).not.toContain('shadow-2xl');
    expect(source).not.toContain('rounded-[2rem]');
    expect(source).not.toContain('hover:-translate-y');
  });

  it('keeps executive overview surfaces restrained and inside the shared graphite language', async () => {
    const [hero, commandCenter, kpi, cockpit] = await Promise.all([
      readFile(EXECUTIVE_HERO, 'utf8'),
      readFile(EXECUTIVE_COMMAND_CENTER, 'utf8'),
      readFile(EXECUTIVE_KPI, 'utf8'),
      readFile(EXECUTIVE_COCKPIT, 'utf8'),
    ]);

    for (const source of [hero, commandCenter, kpi, cockpit]) {
      expect(source).toContain('rounded-xl');
      expect(source).not.toContain('rounded-[2rem]');
      expect(source).not.toContain('shadow-2xl');
      expect(source).not.toContain('blur-3xl');
      expect(source).not.toContain('hover:-translate-y');
    }

    expect(hero).toContain('Executive overview');
    expect(hero).toContain('bg-emerald-300');
    expect(commandCenter).toContain('Live governance signals');
    expect(commandCenter).not.toContain('AI recommendation');
    expect(kpi).toContain('Executive KPIs');
    expect(cockpit).not.toContain('Above early-stage B2B average');
    expect(cockpit).not.toContain('Benchmark');
  });

  it('presents deterministic governance guidance without legacy AI-template branding', async () => {
    const source = await readFile(GOVERNANCE_ASSISTANT, 'utf8');

    expect(source).toContain('Governance assistant');
    expect(source).toContain('Deterministic guidance derived from live RISCK COMPLY workspace data');
    expect(source).not.toContain('Ask EuroComply');
    expect(source).not.toContain('AI copilot');
    expect(source).not.toContain('violet-');
    expect(source).not.toContain('sky-');
    expect(source).not.toContain('blur-3xl');
    expect(source).not.toContain('hover:-translate-y');
  });

  it('keeps the operational feed limited to real workspace records', async () => {
    const source = await readFile(ACTIVITY_FEED, 'utf8');

    expect(source).toContain('No placeholder activity is added');
    expect(source).not.toContain('report-ready');
    expect(source).not.toContain('Executive report ready to export');
    expect(source).not.toContain("type: 'report'");
    expect(source).not.toContain('shadow-2xl');
    expect(source).not.toContain('rounded-[2rem]');
  });

  it('uses compact evidence and risk traceability surfaces instead of decorative graph cards', async () => {
    const [risk, relationship, evidence] = await Promise.all([
      readFile(RISK_HEATMAP, 'utf8'),
      readFile(RELATIONSHIP_GRAPH, 'utf8'),
      readFile(EVIDENCE_GRAPH, 'utf8'),
    ]);

    for (const source of [risk, relationship, evidence]) {
      expect(source).toContain('rounded-xl border border-white/[0.075] bg-[#101715]');
      expect(source).not.toContain('blur-3xl');
      expect(source).not.toContain('shadow-2xl');
      expect(source).not.toContain('rounded-[2rem]');
      expect(source).not.toContain('hover:-translate-y');
    }

    expect(risk).toContain('Impact × probability');
    expect(relationship).toContain('it does not add synthetic dependency data');
    expect(evidence).toContain('rather than placeholder metrics');
  });

  it('replaces synthetic reporting projections with factual leadership and remediation views', async () => {
    const [boardMode, planner] = await Promise.all([
      readFile(BOARD_MODE, 'utf8'),
      readFile(REMEDIATION_PLANNER, 'utf8'),
    ]);

    expect(boardMode).toContain('Leadership summary');
    expect(boardMode).toContain('using only current score, risk, vendor, evidence and action data');
    expect(boardMode).not.toContain('Ready for customer, investor and leadership review');
    expect(boardMode).not.toContain('rounded-[2rem]');
    expect(boardMode).not.toContain('blur-3xl');

    expect(planner).toContain('Remediation planner');
    expect(planner).toContain('It does not predict future compliance scores or invent projected uplift');
    expect(planner).not.toContain('projectedScore');
    expect(planner).not.toContain('Potential lift');
    expect(planner).not.toContain('Combined sprint');
    expect(planner).not.toContain('blur-3xl');
    expect(planner).not.toContain('rounded-[2rem]');
  });
});
