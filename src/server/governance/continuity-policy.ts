export type ContinuityControlCategory =
  | 'cloud_hosting'
  | 'database_platform'
  | 'payments'
  | 'monitoring'
  | 'incident_process'
  | 'backup_restore'
  | 'evidence_exports'
  | 'customer_communications';

export type ContinuityControl = {
  category: ContinuityControlCategory;
  label: string;
  description: string;
  target: string;
  recoveryTier: 'standard' | 'priority' | 'critical';
  enterpriseReady: boolean;
};

export const CONTINUITY_CONTROLS: ContinuityControl[] = [
  {
    category: 'cloud_hosting',
    label: 'Managed application hosting',
    description: 'Application delivery runs on managed cloud hosting with production build, deployment and rollback workflows.',
    target: 'Rollback-ready deployment workflow',
    recoveryTier: 'critical',
    enterpriseReady: true,
  },
  {
    category: 'database_platform',
    label: 'Managed database platform',
    description: 'Customer workspace data is stored on Supabase with project-level operational controls and documented migrations.',
    target: 'Managed database operations and migration history',
    recoveryTier: 'critical',
    enterpriseReady: true,
  },
  {
    category: 'payments',
    label: 'Billing continuity',
    description: 'Stripe handles checkout, customer portal and subscription events through signed webhook processing.',
    target: 'Subscription state recoverable from Stripe events',
    recoveryTier: 'priority',
    enterpriseReady: true,
  },
  {
    category: 'monitoring',
    label: 'Operational monitoring',
    description: 'Health, readiness, smoke and enterprise readiness endpoints provide structured checks for production operations.',
    target: 'Health checks and readiness checks available',
    recoveryTier: 'priority',
    enterpriseReady: true,
  },
  {
    category: 'incident_process',
    label: 'Incident process',
    description: 'Security and availability procedures are documented with severity triage, customer communication and review steps.',
    target: 'Documented incident response workflow',
    recoveryTier: 'critical',
    enterpriseReady: true,
  },
  {
    category: 'backup_restore',
    label: 'Backup and restore evidence',
    description: 'Backup and continuity procedures are documented; production restore evidence should be reviewed before enterprise launch.',
    target: 'Documented restore test evidence',
    recoveryTier: 'critical',
    enterpriseReady: false,
  },
  {
    category: 'evidence_exports',
    label: 'Evidence portability',
    description: 'Audit Evidence Pack exports provide a structured, verifiable snapshot of operational and governance evidence.',
    target: 'Signed evidence export available for Business+ plans',
    recoveryTier: 'priority',
    enterpriseReady: true,
  },
  {
    category: 'customer_communications',
    label: 'Customer communications',
    description: 'Public trust, status and service commitment pages support transparent customer communication during operational events.',
    target: 'Public trust and service status resources available',
    recoveryTier: 'standard',
    enterpriseReady: true,
  },
];

export function getContinuityReadinessScore(controls = CONTINUITY_CONTROLS) {
  if (controls.length === 0) return 0;
  const ready = controls.filter((control) => control.enterpriseReady).length;
  return Math.round((ready / controls.length) * 100);
}

export function getContinuityLevel(score: number): 'foundation' | 'operational' | 'enterprise_ready' {
  if (score >= 90) return 'enterprise_ready';
  if (score >= 70) return 'operational';
  return 'foundation';
}

export function getContinuitySummary(controls = CONTINUITY_CONTROLS) {
  const readinessScore = getContinuityReadinessScore(controls);
  const criticalControls = controls.filter((control) => control.recoveryTier === 'critical').length;
  const readyControls = controls.filter((control) => control.enterpriseReady).length;
  const openCriticalControls = controls.filter((control) => control.recoveryTier === 'critical' && !control.enterpriseReady).length;

  return {
    readinessScore,
    level: getContinuityLevel(readinessScore),
    totalControls: controls.length,
    readyControls,
    criticalControls,
    openCriticalControls,
    nextActions: buildContinuityNextActions({ readinessScore, openCriticalControls }),
  };
}

function buildContinuityNextActions({ readinessScore, openCriticalControls }: { readinessScore: number; openCriticalControls: number }) {
  const actions: string[] = [];

  if (openCriticalControls > 0) {
    actions.push('Run and document a production restore exercise for enterprise procurement readiness.');
  }

  if (readinessScore < 90) {
    actions.push('Attach operational evidence to continuity controls before sharing enterprise due diligence materials.');
  }

  actions.push('Review the continuity posture quarterly and after major infrastructure or data model changes.');

  return actions;
}
