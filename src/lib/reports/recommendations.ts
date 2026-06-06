type DashboardSummaryLike = {
  complianceScore: number;
  openTasks: number;
  openRisks: number;
  criticalRisks: number;
  highRiskVendors: number;
  missingDocuments: number;
  totals: {
    tasks: number;
    risks: number;
    vendors: number;
    documents: number;
  };
};

export type MaturityLevel = 'Initial' | 'Developing' | 'Managed' | 'Optimized';

export function getComplianceMaturity(score: number): { level: MaturityLevel; description: string } {
  if (score >= 81) {
    return {
      level: 'Optimized',
      description: 'Controls and evidence are largely in place. Keep momentum through periodic reviews and trend monitoring.',
    };
  }

  if (score >= 61) {
    return {
      level: 'Managed',
      description: 'The program is operational but still has meaningful gaps that leadership should prioritize.',
    };
  }

  if (score >= 41) {
    return {
      level: 'Developing',
      description: 'Core workflows exist, but unresolved risks, missing evidence or vendor gaps may slow audit readiness.',
    };
  }

  return {
    level: 'Initial',
    description: 'Compliance operations need immediate structure around ownership, evidence, risks and vendor review.',
  };
}

export function buildScorecards(summary: DashboardSummaryLike) {
  return [
    {
      area: 'Documents',
      score: summary.totals.documents === 0 ? 0 : Math.max(0, Math.round(100 - (summary.missingDocuments / summary.totals.documents) * 100)),
      metrics: [
        `${summary.totals.documents} total documents`,
        `${summary.missingDocuments} missing or unapproved documents`,
      ],
    },
    {
      area: 'Vendors',
      score: summary.totals.vendors === 0 ? 0 : Math.max(0, Math.round(100 - (summary.highRiskVendors / summary.totals.vendors) * 100)),
      metrics: [
        `${summary.totals.vendors} total vendors`,
        `${summary.highRiskVendors} high-risk vendors`,
      ],
    },
    {
      area: 'Risks',
      score: summary.totals.risks === 0 ? 0 : Math.max(0, Math.round(100 - (summary.criticalRisks / summary.totals.risks) * 100)),
      metrics: [
        `${summary.openRisks} open risks`,
        `${summary.criticalRisks} critical risks`,
      ],
    },
    {
      area: 'Tasks',
      score: summary.totals.tasks === 0 ? 0 : Math.max(0, Math.round(100 - (summary.openTasks / summary.totals.tasks) * 100)),
      metrics: [
        `${summary.totals.tasks} total tasks`,
        `${summary.openTasks} open tasks`,
      ],
    },
  ];
}

export function buildNextBestActions(summary: DashboardSummaryLike) {
  const actions: Array<{ priority: number; action: string }> = [];

  if (summary.criticalRisks > 0) {
    actions.push({ priority: 100, action: `Mitigate or formally accept ${summary.criticalRisks} critical risks.` });
  }

  if (summary.highRiskVendors > 0) {
    actions.push({ priority: 90, action: `Complete review for ${summary.highRiskVendors} high-risk vendors and confirm DPA/security evidence.` });
  }

  if (summary.missingDocuments > 0) {
    actions.push({ priority: 80, action: `Upload or approve ${summary.missingDocuments} missing compliance documents.` });
  }

  if (summary.openTasks > 0) {
    actions.push({ priority: 70, action: `Close or reassign ${summary.openTasks} open compliance tasks.` });
  }

  if (actions.length === 0) {
    actions.push({ priority: 10, action: 'Maintain the current cadence with monthly evidence, vendor and risk reviews.' });
  }

  return actions.sort((a, b) => b.priority - a.priority).map((item) => item.action).slice(0, 5);
}

export function buildRecommendations(summary: DashboardSummaryLike) {
  const recommendations = [
    'Review this report with leadership and assign a single accountable owner for each next best action.',
  ];

  if (summary.complianceScore < 65) {
    recommendations.push('Prioritize foundational cleanup before adding new compliance initiatives.');
  }

  if (summary.criticalRisks > 0) {
    recommendations.push('Create mitigation plans with owners and due dates for every critical risk.');
  }

  if (summary.highRiskVendors > 0) {
    recommendations.push('Collect current DPA, security and subprocessors evidence for high-risk vendors.');
  }

  if (summary.missingDocuments > 0) {
    recommendations.push('Close evidence gaps by uploading missing policies, assessments and approvals.');
  }

  return recommendations;
}

export function buildBoardCommentary(summary: DashboardSummaryLike) {
  const maturity = getComplianceMaturity(summary.complianceScore);
  const exposureParts = [
    `${summary.openTasks} open tasks`,
    `${summary.openRisks} open risks`,
    `${summary.criticalRisks} critical risks`,
    `${summary.highRiskVendors} high-risk vendors`,
    `${summary.missingDocuments} missing documents`,
  ];

  return {
    posture: `The current compliance maturity is ${maturity.level.toLowerCase()} with an overall readiness score of ${summary.complianceScore}%. ${maturity.description}`,
    exposure: `Current unresolved exposure includes ${exposureParts.join(', ')}. Leadership should focus on reducing the highest-risk items first.`,
    operatingFocus: summary.complianceScore >= 81
      ? 'Maintain cadence through recurring reviews, evidence refreshes and trend monitoring.'
      : 'The next operating cycle should focus on closing evidence gaps, reviewing high-risk vendors and reducing critical risks before expanding scope.',
  };
}
