#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const files = {
  root: 'src/app/page.tsx',
  localeHome: 'src/app/[locale]/page.tsx',
  middleware: 'src/middleware.ts',
  dashboardLayout: 'src/app/[locale]/dashboard/layout.tsx',
  orgDashboardLayout: 'src/app/[locale]/dashboard/organizations/layout.tsx',
  shell: 'src/components/dashboard/enterprise-dashboard-shell.tsx',
  orgDashboardAccess: 'src/server/queries/organization-dashboard-access.ts',
  orgDashboard: 'src/app/[locale]/dashboard/organizations/page.tsx',
  dashboardHomeOverview: 'src/components/dashboard/dashboard-home-overview.tsx',
  nextBestActions: 'src/components/dashboard/next-best-actions.tsx',
  orgDashboardQuery: 'src/server/queries/organization-dashboard.ts',
  currentOrganization: 'src/server/queries/current-organization.ts',
  fria: 'src/app/[locale]/dashboard/fria/page.tsx',
  regulatoryControlTower: 'src/app/[locale]/dashboard/regulatory-control-tower/page.tsx',
  aiLiteracy: 'src/app/[locale]/dashboard/ai-literacy/page.tsx',
  intelligence: 'src/app/[locale]/dashboard/organizations/reports-governance/news/page.tsx',
  intelligenceDetail: 'src/app/[locale]/dashboard/organizations/reports-governance/news/[id]/page.tsx',
  intelligenceEditorial: 'src/app/[locale]/dashboard/organizations/reports-governance/news/editorial/page.tsx',
};

const expectations = [
  [files.root, ['redirect', "'/pt'"]],
  [files.localeHome, ['force-static', 'revalidate = 300', 'EnterpriseHome']],
  [files.middleware, ['shouldCheckMarketingHomeAuth', 'ORGANIZATION_DASHBOARD_PATH', 'withPrivateNoStore']],
  [
    files.dashboardLayout,
    [
      "import { EnterpriseDashboardShell } from '@/components/dashboard/enterprise-dashboard-shell'",
      '<EnterpriseDashboardShell',
      'organizationName={organization.name}',
      'role={organization.role}',
      'selectedPlan={authority?.plan}',
    ],
  ],
  [files.orgDashboardLayout, ['getOrganizationDashboardRedirect(safeLocale)', "await import('next/navigation')", 'navigation.redirect(redirectTarget)']],
  [
    files.shell,
    [
      'Enterprise dashboard navigation',
      "localized(locale, '/dashboard/fria')",
      "localized(locale, '/dashboard/regulatory-control-tower')",
      "localized(locale, '/dashboard/ai-literacy')",
      "localized(locale, '/dashboard/evidence')",
      "localized(locale, '/dashboard/organizations/reports-governance/news')",
      "event.key.toLowerCase() === 'k'",
    ],
  ],
  [
    files.orgDashboardAccess,
    [
      'getCurrentUser',
      'getCurrentOrganizationForUser(user.id)',
      'getOrganizationBillingAuthority(currentOrganization.id)',
      'if (!authority.licensed)',
      'if (!currentOrganization.is_onboarding_completed)',
      'encodeURIComponent',
      '`/${locale}/onboarding`',
    ],
  ],
  [
    files.orgDashboard,
    [
      'getCurrentUser',
      'getLoginPath(safeLocale, dashboardPath)',
      'encodeURIComponent(nextPath)',
      'getOrganizationDashboardData',
      'workflowReadiness={data.workflowReadiness}',
    ],
  ],
  [files.dashboardHomeOverview, ['OrganizationWorkflowReadiness', 'workflowReadiness', 'NextBestActions']],
  [files.nextBestActions, ['OrganizationWorkflowReadiness', 'buildWorkflowReadinessAction', 'workflowReadiness', 'current workflow readiness']],
  [
    files.orgDashboardQuery,
    [
      'getCurrentOrganizationForUser',
      'organization.id',
      "eq('organization_id', organizationId)",
      "from('compliance_tasks')",
      "from('risks')",
      "from('vendors')",
      "from('documents')",
      'OrganizationWorkflowReadiness',
      'getOrganizationWorkflowReadiness',
      'workflowReadiness',
      'risk-review-required',
      'open-compliance-work',
      'vendor-review-required',
      'evidence-review-required',
      'ready-for-executive-review',
    ],
  ],
  [
    files.currentOrganization,
    [
      "from('organization_members')",
      'onboarding_status',
      'onboarding_completed_at',
      'is_onboarding_completed',
      'isOrganizationOnboardingCompleted',
      'getCurrentOrganizationForUser',
      'membership.slug === slug',
    ],
  ],
  [files.fria, ["roleHasPermission(snapshot?.role, 'manage_ai_governance')", "run('assessment_approve'", "run('evidence_submit'", 'rounded-xl border border-white/[0.075] bg-[#101715]']],
  [files.regulatoryControlTower, ["fetch('/api/ai-governance/regulatory-control-tower'", 'snapshot.readyPercent', 'snapshot.activationPercent', 'rounded-xl border border-white/[0.075] bg-[#101715]']],
  [files.aiLiteracy, ["fetch('/api/ai-literacy'", "runWorkflow('program_create'", "runWorkflow('assignment_create'", "runWorkflow('evidence_review'", 'rounded-xl border border-white/[0.075] bg-[#101715]']],
  [files.intelligence, ['listPublishedIntelligenceItems()', "canAccessFeature('regulatory_monitoring'", 'Only published items with a real publication date', 'rounded-xl border border-white/[0.075] bg-[#101715]']],
  [files.intelligenceDetail, ['getPublishedIntelligenceItem(id)', "canAccessFeature('regulatory_monitoring'", 'rounded-xl border border-white/[0.075] bg-[#101715]']],
  [files.intelligenceEditorial, ['listPublishedIntelligenceItems()', "isPlanAtLeast(entitlements.plan, 'professional')", 'rounded-xl border border-white/[0.075] bg-[#101715]']],
];

const forbidden = [
  [files.orgDashboardLayout, ['DashboardCommandNavigation']],
  [files.shell, ["localized(locale, '/dashboard/organizations/regulatory-control-tower')", "localized(locale, '/dashboard/organizations/ai-literacy')"]],
  [files.fria, ['min-h-screen bg-[#05070b]', 'rounded-[2rem]', 'focus-visible:ring-violet', "from '@/components/ui/card'", "from '@/components/ui/badge'"]],
  [files.regulatoryControlTower, ['min-h-screen bg-[#05070b]', 'max-w-7xl', 'rounded-[2rem]', 'violet-', "from '@/components/ui/card'", "from '@/components/ui/progress'"]],
  [files.aiLiteracy, ['min-h-screen bg-[#05070b]', 'max-w-7xl', 'rounded-[2rem]', 'shadow-2xl', 'violet-', "from '@/components/ui/card'", "from '@/components/ui/badge'"]],
  [files.intelligence, ['radial-gradient', 'rounded-[2rem]', 'shadow-xl', 'Sparkles']],
  [files.intelligenceDetail, ['radial-gradient', 'rounded-[2rem]', 'shadow-xl', 'Sparkles']],
  [files.intelligenceEditorial, ['radial-gradient', 'rounded-[2rem]', 'shadow-xl', 'Sparkles']],
];

const failures = [];

for (const [file, required] of expectations) {
  if (!existsSync(file)) {
    failures.push(`${file} is missing`);
    continue;
  }

  const content = readFileSync(file, 'utf8');
  for (const phrase of required) {
    if (!content.includes(phrase)) failures.push(`${file} is missing required invariant: ${phrase}`);
  }
}

for (const [file, blocked] of forbidden) {
  if (!existsSync(file)) continue;
  const content = readFileSync(file, 'utf8');
  for (const phrase of blocked) {
    if (content.includes(phrase)) failures.push(`${file} contains retired dashboard pattern: ${phrase}`);
  }
}

if (failures.length > 0) {
  console.error('Phase 5 dashboard invariant check failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 5 dashboard invariant check passed.');
