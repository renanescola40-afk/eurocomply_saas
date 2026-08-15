import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('operational command center boundaries', () => {
  it('keeps the overview short instead of rebuilding a one-page mega dashboard', () => {
    const overview = read('src/components/dashboard/dashboard-home-overview.tsx');
    const page = read('src/app/[locale]/dashboard/organizations/page.tsx');

    expect(overview).toContain('NextBestActions');
    expect(overview).toContain('ComplianceTimeline');
    expect(overview).not.toMatch(/ExecutiveReportingPackage|ReadinessExportPreparation|AuditPackageReview|EvidenceHandoffReview|DashboardExperienceMap|DashboardExperienceIndex|ReadinessFollowUpPlan/);
    expect(page).not.toContain('EnterpriseDashboardOverview');
  });

  it('routes tasks to the dedicated task page rather than approvals', () => {
    const page = read('src/app/[locale]/dashboard/organizations/page.tsx');
    const commandCenter = read('src/components/dashboard/enterprise-compliance-command-center.tsx');

    expect(page).toContain('const localizedTasksPath = `${localizedDashboardBasePath}/tasks`');
    expect(page).not.toContain('const localizedTasksPath = `/${safeLocale}/aprovacoes`');
    expect(commandCenter).toContain('href: `${basePath}/tasks`');
  });

  it('derives the next action and progress from recorded workspace signals', () => {
    const commandCenter = read('src/components/dashboard/enterprise-compliance-command-center.tsx');

    expect(commandCenter).toContain('function getNextAction');
    expect(commandCenter).toContain('aiSystemSummary.unacceptable > 0');
    expect(commandCenter).toContain('summary.criticalRisks > 0');
    expect(commandCenter).toContain('summary.missingDocuments > 0');
    expect(commandCenter).toContain('summary.highRiskVendors > 0');
    expect(commandCenter).toContain('summary.openTasks > 0');
    expect(commandCenter).toContain('completionPercentage(summary.totals.risks, summary.openRisks)');
    expect(commandCenter).toContain('completionPercentage(summary.totals.tasks, summary.openTasks)');
    expect(commandCenter).toContain('documentReadiness(summary)');
    expect(commandCenter).toContain('auditEvents.slice(0, 4)');
    expect(commandCenter).toContain('do not constitute legal advice or a guarantee of compliance');
  });

  it('uses compact activation milestones backed by real dashboard data', () => {
    const page = read('src/app/[locale]/dashboard/organizations/page.tsx');
    const progress = read('src/components/onboarding/onboarding-progress-card.tsx');

    expect(page).toContain('hasFirstAiSystem: data.aiSystemSummary.total > 0');
    expect(page).toContain('hasRiskClassification: data.summary.totals.risks > 0');
    expect(page).toContain('hasDocumentSuggestions: data.summary.totals.documents > 0');
    expect(page).toContain('hasInitialTasks: data.summary.totals.tasks > 0');
    expect(page).toContain('<OnboardingProgressCard state={activationState} compact locale={safeLocale} />');
    expect(progress).toContain('This is activation progress, not a compliance score.');
    expect(progress).toContain('É progresso de ativação, não um score de compliance.');
  });
});
