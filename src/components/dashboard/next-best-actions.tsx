import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
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
      return 'border-rose-400/20 bg-rose-400/[0.08] text-rose-100';
    case 'High':
      return 'border-amber-300/20 bg-amber-300/[0.08] text-amber-100';
    case 'Medium':
      return 'border-sky-300/20 bg-sky-300/[0.07] text-sky-100';
    default:
      return 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100';
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
    <section className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#101715] text-white">
      <div className="flex flex-col gap-2 border-b border-white/[0.065] px-5 py-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/34">Recommended focus</p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white/86">Next best actions</h2>
        </div>
        <p className="max-w-xl text-xs leading-5 text-white/34">
          Prioritized from your current workflow readiness, risk, vendor, document and task posture.
        </p>
      </div>

      <div className="divide-y divide-white/[0.055]">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group grid gap-3 px-5 py-4 transition-colors duration-200 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300/60 lg:grid-cols-[110px_minmax(0,1.2fr)_minmax(220px,0.8fr)_36px] lg:items-center"
          >
            <div>
              <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${getPriorityTone(action.priority)}`}>
                {action.priority}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white/78">{action.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/36">{action.description}</p>
            </div>
            <p className="text-xs leading-5 text-white/30">{action.impact}</p>
            <span className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/28 transition group-hover:border-white/[0.1] group-hover:text-white/65 lg:flex" aria-hidden="true">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
