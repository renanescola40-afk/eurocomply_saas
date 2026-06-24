import Link from 'next/link';
import { ArrowRight, CheckCircle2, CircleAlert, FileText, Gauge, ReceiptText, ShieldCheck, UsersRound } from 'lucide-react';
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
  planName,
  limitsSummary,
}: EnterpriseDashboardOverviewProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const operatingSignals = Math.max(openTasks.length + vendorsRequiringReview.length + documentsExpiringSoon.length, 1);
  const panelItems = [
    {
      key: 'compliance',
      icon: ShieldCheck,
      title: copy.panels.compliance.title,
      body: copy.panels.compliance.body,
      metric: `${summary.complianceScore}%`,
    },
    {
      key: 'risk',
      icon: CircleAlert,
      title: copy.panels.risk.title,
      body: copy.panels.risk.body,
      metric: `${formatCount(summary.criticalRisks)} critical`,
    },
    {
      key: 'tasks',
      icon: CheckCircle2,
      title: copy.panels.tasks.title,
      body: copy.panels.tasks.body,
      metric: `${formatCount(openTasks.length)} open`,
    },
    {
      key: 'documents',
      icon: FileText,
      title: copy.panels.documents.title,
      body: copy.panels.documents.body,
      metric: `${formatCount(summary.missingDocuments)} gaps`,
    },
    {
      key: 'vendors',
      icon: UsersRound,
      title: copy.panels.vendors.title,
      body: copy.panels.vendors.body,
      metric: `${formatCount(summary.highRiskVendors)} high`,
    },
    {
      key: 'audit',
      icon: Gauge,
      title: copy.panels.audit.title,
      body: copy.panels.audit.body,
      metric: `${operatingSignals} signals`,
    },
    {
      key: 'billing',
      icon: ReceiptText,
      title: copy.panels.billing.title,
      body: copy.panels.billing.body,
      metric: planName,
    },
  ];

  return (
    <section
      id="enterprise-compliance-overview"
      aria-labelledby="enterprise-compliance-overview-title"
      className="scroll-mt-28 rounded-[2rem] border bg-background/90 p-5 shadow-xl shadow-primary/5 md:p-8"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]">
            {copy.eyebrow}
          </Badge>
          <div>
            <h2 id="enterprise-compliance-overview-title" className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">{copy.subtitle}</p>
          </div>
          <p className="text-sm text-muted-foreground">{limitsSummary}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full">
            <Link href={basePath} aria-label={copy.openOrganizations}>
              {copy.openOrganizations} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full bg-background/70">
            <Link href={`${basePath}/documents`} aria-label={copy.viewDocuments}>
              {copy.viewDocuments}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full bg-background/70">
            <Link href={`${basePath}/aprovacoes`} aria-label={copy.viewTasks}>
              {copy.viewTasks}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {panelItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="rounded-3xl border-border/70 bg-muted/20 transition hover:border-primary/40">
              <CardHeader className="gap-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-2xl bg-primary/10 p-2 text-primary" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">{item.metric}</span>
                </div>
                <CardTitle className="text-lg leading-6">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl border bg-muted/20 p-4 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{copy.statesTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{copy.statesSubtitle}</p>
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
                className="rounded-2xl border bg-background/80 p-4 focus-within:ring-2 focus-within:ring-ring"
                tabIndex={0}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-6">{item.title}</p>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{item.tone}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
