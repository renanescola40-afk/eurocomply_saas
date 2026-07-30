import { createHash } from 'node:crypto';

export const QUALIFIED_REVIEW_TECHNICAL_SCOPE = [
  'campaigns','reviewers','assignments','invites','sessions','attestations','submissions','decisions','reminders','evidence_packages',
] as const;

export type FinalCloseoutInput = {
  campaignId: string;
  targetSha: string;
  acceptedReviewCount: number;
  acceptedPoints: number;
  evidencePackageDigest?: string | null;
  technicalControls: Record<string, boolean>;
};

export function evaluateQualifiedReviewFinalCloseout(input: FinalCloseoutInput) {
  const missingControls = QUALIFIED_REVIEW_TECHNICAL_SCOPE.filter((control) => input.technicalControls[control] !== true);
  const humanBlockers = [
    ...(input.acceptedReviewCount === 8 ? [] : [`accepted_review_count:${input.acceptedReviewCount}/8`]),
    ...(input.acceptedPoints === 51 ? [] : [`accepted_points:${input.acceptedPoints}/51`]),
    ...(input.evidencePackageDigest ? [] : ['evidence_package_missing']),
  ];
  const technicalBlockers = missingControls.map((control) => `technical_control_missing:${control}`);
  const technicalComplete = technicalBlockers.length === 0;
  const operationalComplete = technicalComplete && humanBlockers.length === 0;
  const core = {
    version: 2,
    campaignId: input.campaignId,
    targetSha: input.targetSha,
    acceptedReviewCount: input.acceptedReviewCount,
    acceptedPoints: input.acceptedPoints,
    evidencePackageDigest: input.evidencePackageDigest ?? null,
    technicalControls: Object.fromEntries(QUALIFIED_REVIEW_TECHNICAL_SCOPE.map((control) => [control, input.technicalControls[control] === true])),
    technicalComplete,
    operationalComplete,
    technicalBlockers,
    humanBlockers,
    humanStatus: operationalComplete ? 'HUMAN_EXECUTION_COMPLETE' : 'HUMAN_EXECUTION_PENDING',
    conversationStatus: technicalComplete ? 'TECHNICAL_SCOPE_COMPLETE' : 'TECHNICAL_SCOPE_OPEN',
    truthBoundary: 'Technical closeout is not certification, legal approval, notified-body assessment or regulator acceptance.',
  } as const;
  return { ...core, closeoutDigest: createHash('sha256').update(JSON.stringify(core)).digest('hex') };
}
