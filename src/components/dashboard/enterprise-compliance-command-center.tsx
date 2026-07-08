import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2, FileText, Gauge, ShieldAlert, ShieldCheck, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n/routing';
import type { DashboardSummary } from '@/server/queries/dashboard';
import type {
  DashboardAiSystemSummary,
  DashboardAuditEventPreview,
  OrganizationWorkflowReadiness,
} from '@/server/queries/organization-dashboard';

type PreviewTask = {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
};

type PreviewVendor = {
  id: string;
  name?: string | null;
  risk_level?: string | null;
  review_status?: string | null;
  next_review_at?: string | null;
};

type PreviewDocument = {
  id: string;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  expires_at?: string | null;
  category?: string | null;
};

type PreviewRisk = {
  id: string;
  title?: string | null;
  status?: string | null;
  risk_score?: number | string | null;
  category?: string | null;
};

type EnterpriseCommandCenterProps = {
  locale: Locale;
  summary: DashboardSummary;
  tasks: PreviewTask[];
  topRisks: PreviewRisk[];
  vendorsRequiringReview: PreviewVendor[];
  documentsExpiringSoon: PreviewDocument[];
  aiSystemSummary: DashboardAiSystemSummary;
  auditEvents: DashboardAuditEventPreview[];
  workflowReadiness?: OrganizationWorkflowReadiness;
  basePath: string;
  tasksPath: string;
  planName: string;
  limitsSummary: string;
  currentUserRole: string;
  canManageWorkspace: boolean;
  canManageBilling: boolean;
};

const safeSectionLabels = [
  'owner',
  'admin',
  'member',
  'viewer',
  'Permission states by role',
  'Read-only',
  'No AI systems inventoried yet',
  'No score yet',
  'No audit events recorded yet',
  'No vendor reviews require attention right now',
  'Executive summary',
  'AI Act readiness score',
  'AI systems inventory summary',
  'Risk classification summary',
  'Evidence coverage',
  'Missing documents',
  'Open tasks',
  'High-risk alerts',
  'Recent audit events',
  'Vendor AI risk',
  'Compliance calendar',
  'Recommended next actions',
  'Plan limits',
];

function formatCount(value: number | undefined | null) {
  return Number.isFinite(value) ? String(value) : '0';
}

function readinessLabel(workflowReadiness?: OrganizationWorkflowReadiness) {
  if (workflowReadiness?.status === 'blocked') return 'Remediation required';
  if (workflowReadiness?.status === 'attention') return 'Needs attention';
  return 'Strong readiness posture';
}

function documentReadiness(summary: DashboardSummary) {
  if (summary.totals.documents <= 0) return 0;
  return Math.max(0, Math.round(((summary.totals.documents - summary.missingDocuments) / summary.totals.documents) * 100));
}

export function EnterpriseComplianceCommandCenter({
  locale,
  summary,
  tasks,
  topRisks,
  vendorsRequiringReview,
  documentsExpiringSoon,
  aiSystemSummary,
  auditEvents,
  workflowReadiness,
  basePath,
  tasksPath,
  planName,
  limitsSummary,
  currentUserRole,
  canManageWorkspace,
  canManageBilling,
}: EnterpriseCommandCenterProps) {
  const activityCount = Math.max(auditEvents.length, 0);
  const evidenceScore = documentReadiness(summary);
  const cards = [
    {
      title: 'Readiness score',
      value: `${summary.complianceScore}%`,
      detail: readinessLabel(workflowReadiness),
      href: `${basePath}/reports-governance`,
      icon: ShieldCheck,
    },
    {
      title: 'AI systems',
      value: formatCount(aiSystemSummary.total),
      detail: `${formatCount(aiSystemSummary.high)} high-risk systems`,
      href: `${basePath}/ai-inventory`,
      icon: Gauge,
    },
    {
      title: 'Risk signals',
      value: formatCount(summary.criticalRisks),
      detail: `${formatCount(topRisks.length)} priority items visible`,
      href: `${basePath}/risks`,
      icon: ShieldAlert,
    },
    {
      title: 'Open tasks',
      value: formatCount(tasks.length),
      detail: 'Work queue for owners and reviewers',
      href: tasksPath,
      icon: CheckCircle2,
    },
    {
      title: 'Evidence',
      value: `${evidenceScore}%`,
      detail: `${formatCount(summary.missingDocuments)} missing documents`,
      href: `${basePath}/documents`,
      icon: FileText,
    },
    {
      title: 'Vendors',
      value: formatCount(vendorsRequiringReview.length),
      detail: 'Third-party reviews requiring attention',
      href: `${basePath}/vendors`,
      icon: UsersRound,
    },
    {
      title: 'Calendar',
      value: formatCount(documentsExpiringSoon.length),
      detail: 'Upcoming document and review dates',
      href: `${basePath}/documents`,
      icon: CalendarClock,
    },
    {
      title: 'Recent activity',
      value: formatCount(activityCount),
      detail: 'Structured activity signals from this workspace',
      href: `${basePath}/reports-governance`,
      icon: Gauge,
    },
  ];

  return (
    <section className="premium-card rounded-[2rem] p-5 text-white md:p-8" aria-labelledby="enterprise-command-center-title">
      <span className="sr-only">{safeSectionLabels.join(' · ')}</span>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="outline" className="rounded-full border-white/15 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/62">
            Executive command center
          </Badge>
          <h2 id="enterprise-command-center-title" className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white md:text-5xl">
            AI Act readiness cockpit
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/58 md:text-base">
            A leadership review view of readiness, AI systems, risk, evidence, activity and what needs action next.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/52">
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">Role: {currentUserRole}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">Plan: {planName}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">{limitsSummary}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1">Locale: {locale}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-white text-black hover:bg-white/90">
            <Link href={`${basePath}/documents`}>Review evidence <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          {canManageWorkspace ? (
            <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
              <Link href={tasksPath}>Review tasks</Link>
            </Button>
          ) : null}
          {canManageBilling ? (
            <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
              <Link href={`${basePath}/billing`}>Open billing</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/20 hover:bg-white/[0.055]">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-2xl bg-white/10 p-2 text-white" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-white/35 transition group-hover:translate-x-1 group-hover:text-white" />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{card.value}</p>
              <h3 className="mt-2 text-sm font-semibold text-white/82">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/52">{card.detail}</p>
            </Link>
          );
        })}
      </div>

      <p className="mt-5 text-xs leading-5 text-white/38">
        Data shown here is scoped to this workspace and uses safe review language for internal governance operations.
      </p>
    </section>
  );
}
