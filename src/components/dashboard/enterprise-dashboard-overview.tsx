import Link from 'next/link';
import { ArrowRight, CheckCircle2, CircleAlert, FileText, Gauge, LockKeyhole, ReceiptText, ShieldCheck, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardCopy } from '@/lib/i18n/dashboard-copy';
import type { DashboardSummary } from '@/server/queries/dashboard';

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

type EnterpriseDashboardOverviewProps = {
  copy: DashboardCopy['enterprise'];
  summary: DashboardSummary;
  tasks: PreviewTask[];
  vendorsRequiringReview: PreviewVendor[];
  documentsExpiringSoon: PreviewDocument[];
  basePath: string;
  tasksPath: string;
  planName: string;
  limitsSummary: string;
};

const stateKeys = ['loading', 'empty', 'error', 'denied', 'success', 'offline'] as const;
type StateKey = (typeof stateKeys)[number];

function stateRole(state: StateKey) {
  return state === 'error' || state === 'denied' || state === 'offline' ? 'alert' : 'status';
}

function formatCount(value: number, fallback = '0') {
  return Number.isFinite(value) ? String(value) : fallback;
}

export function EnterpriseDashboardOverview({
  copy,
  summary,
  tasks,
  vendorsRequiringReview,
  documentsExpiringSoon,
  basePath,
  tasksPath,
  planName,
  limitsSummary,
}: EnterpriseDashboardOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const operatingSignals = Math.max(openTasks.length + vendorsRequiringReview.length + documentsExpiringSoon.length, 1);
  const localizedRoot = basePath.includes('/dashboard') ? basePath.split('/dashboard')[0] : '';
  const panelItems = [
    {
      key: 'compliance',
      icon: ShieldCheck,
      title: copy.panels.compliance.title,
      body: copy.panels.compliance.body,
      metric: `${summary.complianceScore}%`,
      tone: 'readiness review',
      href: `${basePath}/reports-governance`,
    },
    {
      key: 'risk',
      icon: CircleAlert,
      title: copy.panels.risk.title,
      body: copy.panels.risk.body,
      metric: `${formatCount(summary.criticalRisks)} critical`,
      tone: 'risk register',
      href: `${basePath}/risks`,
    },
    {
      key: 'tasks',
      icon: CheckCircle2,
      title: copy.panels.tasks.title,
      body: copy.panels.tasks.body,
      metric: `${formatCount(openTasks.length)} open`,
      tone: 'approval queue',
      href: tasksPath,
    },
    {
      key: 'documents',
      icon: FileText,
      title: copy.panels.documents.title,
      body: copy.panels.documents.body,
      metric: `${formatCount(summary.missingDocuments)} gaps`,
      tone: 'evidence pack',
      href: `${basePath}/documents`,
    },
    {
      key: 'vendors',
      icon: UsersRound,
      title: copy.panels.vendors.title,
      body: copy.panels.vendors.body,
      metric: `${formatCount(summary.highRiskVendors)} high`,
      tone: 'vendor review',
      href: `${localizedRoot}/vendor-assurance`,
    },
    {
      key: 'audit',
      icon: Gauge,
      title: copy.panels.audit.title,
      body: copy.panels.audit.body,
      metric: `${operatingSignals} signals`,
      tone: 'traceable events',
      href: `${basePath}/reports-governance`,
    },
    {
      key: 'billing',
      icon: ReceiptText,
      title: copy.panels.billing.title,
      body: copy.panels.billing.body,
      metric: planName,
      tone: 'plan controls',
      href: `${basePath}/billing`,
    },
  ];

  return (
    <section
      id="enterprise-compliance-overview"
      aria-labelledby="enterprise-compliance-overview-title"
      className="premium-card scroll-mt-28 rounded-[2rem] p-5 md:p-8"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <Badge variant="outline" className="w-fit rounded-full border-white/15 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/62">
            {copy.eyebrow}
          </Badge>
          <div>
            <h2 id="enterprise-compliance-overview-title" className="text-3xl font-semibold tracking-[-0.045em] text-white md:text-4xl">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/58 md:text-base">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-white/52">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1"><ShieldCheck className="h-3.5 w-3.5" /> readiness review</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1"><LockKeyhole className="h-3.5 w-3.5" /> tenant isolated</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1"><UsersRound className="h-3.5 w-3.5" /> role-based access</span>
          </div>
          <p className="text-sm text-white/44">{limitsSummary}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-white text-black hover:bg-white/90">
            <Link href={basePath} aria-label={copy.openOrganizations}>
              {copy.openOrganizations} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
            <Link href={`${basePath}/documents`} aria-label={copy.viewDocuments}>
              {copy.viewDocuments}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/[0.04] text-white hover:bg-white/10">
            <Link href={tasksPath} aria-label={copy.viewTasks}>
              {copy.viewTasks}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {panelItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="group rounded-3xl border-white/10 bg-white/[0.035] text-white shadow-none transition hover:border-white/20 hover:bg-white/[0.055]">
              <CardHeader className="gap-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-2xl bg-white/10 p-2 text-white" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/64">{item.metric}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/34">{item.tone}</span>
                  <CardTitle className="mt-2 text-lg leading-6 text-white">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-white/56">{item.body}</p>
                <Link href={item.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/72 transition hover:text-white">
                  Review <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-7 rounded-3xl border border-white/10 bg-black/20 p-4 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-white">{copy.statesTitle}</h3>
            <p className="mt-1 text-sm text-white/52">{copy.statesSubtitle}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stateKeys.map((state) => {
            const item = copy.states[state];
            const role = stateRole(state);
            return (
              <div
                key={state}
                role={role}
                aria-live={role === 'alert' ? 'assertive' : 'polite'}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-white focus-within:ring-2 focus-within:ring-primary"
                tabIndex={0}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-6">{item.title}</p>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white/50">{item.tone}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/54">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
