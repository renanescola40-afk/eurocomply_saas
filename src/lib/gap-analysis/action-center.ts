export type GapActionSeverity = 'critical' | 'medium';

export type GapAction = {
  article: string;
  recommendation: string;
  severity: GapActionSeverity;
};

export type GapActionCenterSummary = {
  criticalGaps: number;
  mediumRisks: number;
  openActions: number;
  readinessLabel: 'ready' | 'attention' | 'critical';
};

export function buildGapActionCenter(actions: GapAction[], score: number): GapActionCenterSummary {
  const criticalGaps = actions.filter((action) => action.severity === 'critical').length;
  const mediumRisks = actions.filter((action) => action.severity === 'medium').length;

  return {
    criticalGaps,
    mediumRisks,
    openActions: actions.length,
    readinessLabel: score >= 80 ? 'ready' : score >= 50 ? 'attention' : 'critical',
  };
}

export function groupGapActionsByArticle(actions: GapAction[]) {
  return actions.reduce<Record<string, GapAction[]>>((acc, action) => {
    if (!acc[action.article]) acc[action.article] = [];
    acc[action.article].push(action);
    return acc;
  }, {});
}

export function getTopGapActions(actions: GapAction[], limit = 5) {
  return [...actions]
    .sort((a, b) => {
      const severityA = a.severity === 'critical' ? 0 : 1;
      const severityB = b.severity === 'critical' ? 0 : 1;
      return severityA - severityB;
    })
    .slice(0, limit);
}
