export type ComplianceScoreLevel = 'critical' | 'weak' | 'moderate' | 'strong';

export function getComplianceScoreLevel(score: number): ComplianceScoreLevel {
  if (score < 40) return 'critical';
  if (score < 65) return 'weak';
  if (score < 85) return 'moderate';
  return 'strong';
}

export function getComplianceScoreLabel(score: number) {
  const level = getComplianceScoreLevel(score);

  const labels: Record<ComplianceScoreLevel, string> = {
    critical: 'Critical',
    weak: 'Needs attention',
    moderate: 'Improving',
    strong: 'Strong',
  };

  return labels[level];
}
