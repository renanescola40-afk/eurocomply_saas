import Link from 'next/link';
import type { OrganizationWorkflowReadiness } from '@/server/queries/organization-dashboard';
import type { DashboardSummary } from '@/server/queries/dashboard';

type NextBestActionsProps = {
  summary: DashboardSummary;
  basePath: string;
  workflowReadiness?: OrganizationWorkflowReadiness;
};

type ActionItem = {
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  impact: string;
  href: string;
};

function getPriorityTone(priority: ActionItem['priority']) {
  switch (priority) {
    case 'Critical':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
    case 'High':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'Medium':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
    default:
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
}

function buildWorkflowReadinessAction(workflowReadiness: OrganizationWorkflowReadiness | undefined, basePath: string): ActionItem | null {
  if (!workflowReadiness) return null;

  if (workflowReadiness.status === 'blocked') {
    return {
      title: 'Stabilize blocked workflow readiness',
      description: 'Your organization workflow readiness is blocked. Review the highest-impact risk, evidence, vendor and task gaps before executive reporting.',
      priority: 'Critical',
      impact: 'Restores a clear path to structured governance review.',
      href: `${basePath}/risks`,
    };
  }

  if (workflowReadiness.status === 'attention') {
    return {
      title: 'Resolve workflow readiness blockers',
      description: `${workflowReadiness.reasons.length} readiness signal${workflowReadiness.reasons.length === 1 ? '' : 's'} need review before the next governance checkpoint.`,
      priority: 'High',
      impact: 'Improves operational confidence before leadership review.',
      href: `${basePath}/tasks`,
    };
  }

  return {
    title: 'Capture workflow readiness evidence',
    description: 'Your organization workflow readiness looks healthy. Generate an executive pack while the current state is structured.',
    priority: 'Low',
    impact: 'Creates a shareable readiness snapshot.',
    href: `${basePath}/reports`,
  };
}

function buildActions(summary: DashboardSummary, basePath: string, workflowReadiness?: OrganizationWorkflowReadiness): ActionItem[] {
  const actions: ActionItem[] = [];
  const readinessAction = buildWorkflowReadinessAction(workflowReadiness, basePath);

  if (readinessAction && readinessAction.priority !== 'Low') {
    actions.push(readinessAction);
  }

  if (summary.criticalRisks > 0) {
    actions.push({
      title: 'Reduce critical risk exposure',
      description: `${summary.criticalRisks} critical risk${summary.criticalRisks === 1 ? '' : 's'} need owner review and treatment decisions.`,
      priority: 'Critical',
      impact: 'Improves board confidence and governance readiness.',
      href: `${basePath}/risks`,
    });
  }

  if (summary.highRiskVendors > 0) {
    actions.push({
      title: 'Review high-risk vendors',
      description: `${summary.highRiskVendors} vendor${summary.highRiskVendors === 1 ? '' : 's'} require DPA, security or review follow-up.`,
      priority: summary.criticalRisks > 0 ? 'High' : 'Critical',
      impact: 'Reduces third-party and processor exposure.',
      href: `${basePath}/vendors`,
    });
  }

  if (summary.missingDocuments > 0) {
    actions.push({
      title: 'Close evidence gaps',
      description: `${summary.missingDocuments} document${summary.missingDocuments === 1 ? '' : 's'} are missing or not ready for review.`,
      priority: 'High',
      impact: 'Improves evidence completeness for reviews and customer questions.',
      href: `${basePath}/documents`,
    });
  }

  if (summary.openTasks > 0) {
    actions.push({
      title: 'Clear open governance work',
      description: `${summary.openTasks} task${summary.openTasks === 1 ? '' : 's'} are still open across the program.`,
      priority: actions.length > 0 ? 'Medium' : 'High',
      impact: 'Improves execution velocity and ownership clarity.',
      href: `${basePath}/tasks`,
    });
  }

  if (actions.length === 0) {
    actions.push(
      readinessAction ?? {
        title: 'Generate an executive report',
        description: 'Your operational posture looks healthy. Capture the current state for leadership or customer review.',
        priority: 'Low',
        impact: 'Creates a shareable governance snapshot.',
        href: `${basePath}/reports`,
      },
    );
  }

  return actions.slice(0, 4);
}

export function NextBestActions({ summary, basePath, workflowReadiness }: NextBestActionsProps) {
  const actions = buildActions(summary, basePath, workflowReadiness);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-xl md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/80">Recommended focus</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Next best actions</h2>
        </div>
        <p className="max-w-xl text-sm text-slate-400">
          Prioritized from your current workflow readiness, risk, vendor, document and task posture.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {actions.map((action) => (
          <Link key={action.title} href={action.href} className="group flex min-h-56 flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/[0.07]">
            <div className="flex items-start justify-between gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityTone(action.priority)}`}>
                {action.priority}
              </span>
              <span className="text-xs text-slate-500 transition group-hover:text-primary">Open →</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold leading-tight">{action.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{action.description}</p>
            <p className="mt-auto pt-5 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{action.impact}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
