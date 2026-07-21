export const PROHIBITED_PRACTICE_SIGNALS = [
  'subliminal_manipulation',
  'vulnerability_exploitation',
  'social_scoring',
  'criminal_risk_prediction',
  'untargeted_facial_scraping',
  'emotion_inference_workplace_education',
  'biometric_categorisation_sensitive_traits',
  'real_time_remote_biometric_public_space',
] as const;

export type ProhibitedPracticeSignal = (typeof PROHIBITED_PRACTICE_SIGNALS)[number];
export type ProhibitedPracticeAnswer = 'yes' | 'no' | 'unknown';
export type ProhibitedPracticeDisposition = 'clear' | 'review_required' | 'blocked_pending_legal_review';

export type ProhibitedPracticeAnswers = Partial<Record<ProhibitedPracticeSignal, ProhibitedPracticeAnswer | boolean | null>>;

export type ProhibitedPracticeFinding = {
  signal: ProhibitedPracticeSignal;
  answer: ProhibitedPracticeAnswer;
  title: string;
  articleReference: string;
  rationale: string;
  requiredEvidence: string[];
};

export type ProhibitedPracticeAssessment = {
  version: string;
  disposition: ProhibitedPracticeDisposition;
  blockProductionUse: boolean;
  legalReviewRequired: boolean;
  positiveSignals: ProhibitedPracticeSignal[];
  unknownSignals: ProhibitedPracticeSignal[];
  findings: ProhibitedPracticeFinding[];
  requiredActions: string[];
  evidenceBoundary: string;
};

const VERSION = '2026-07-20.1';

const DEFINITIONS: Record<ProhibitedPracticeSignal, Omit<ProhibitedPracticeFinding, 'signal' | 'answer'>> = {
  subliminal_manipulation: {
    title: 'Subliminal or purposefully manipulative techniques',
    articleReference: 'Article 5(1)(a)',
    rationale: 'The system may use subliminal, manipulative or deceptive techniques that materially distort behaviour and may cause significant harm.',
    requiredEvidence: ['intended-purpose statement', 'behavioural design review', 'harm analysis', 'human-factors safeguards'],
  },
  vulnerability_exploitation: {
    title: 'Exploitation of age, disability or social/economic vulnerability',
    articleReference: 'Article 5(1)(b)',
    rationale: 'The system may exploit a person or group vulnerability in a way that materially distorts behaviour and may cause significant harm.',
    requiredEvidence: ['affected-groups analysis', 'vulnerability assessment', 'safeguards and exclusions', 'legal review'],
  },
  social_scoring: {
    title: 'Prohibited social scoring',
    articleReference: 'Article 5(1)(c)',
    rationale: 'The system may evaluate or classify people over time based on social behaviour or personal characteristics with prohibited detrimental treatment.',
    requiredEvidence: ['scoring methodology', 'input-feature inventory', 'decision-use mapping', 'fundamental-rights review'],
  },
  criminal_risk_prediction: {
    title: 'Individual criminal-offence risk prediction',
    articleReference: 'Article 5(1)(d)',
    rationale: 'The system may predict an individual criminal-offence risk based solely on profiling or personality traits, subject to narrow legal distinctions.',
    requiredEvidence: ['decision basis', 'human assessment evidence', 'law-enforcement legal basis', 'profiling review'],
  },
  untargeted_facial_scraping: {
    title: 'Untargeted facial-image scraping',
    articleReference: 'Article 5(1)(e)',
    rationale: 'The system may create or expand facial-recognition databases through untargeted scraping from the internet or CCTV footage.',
    requiredEvidence: ['image provenance', 'collection method', 'dataset inventory', 'deletion and exclusion controls'],
  },
  emotion_inference_workplace_education: {
    title: 'Emotion inference in workplaces or education',
    articleReference: 'Article 5(1)(f)',
    rationale: 'The system may infer emotions in workplace or educational contexts outside a potentially applicable medical or safety exception.',
    requiredEvidence: ['context-of-use record', 'claimed exception basis', 'necessity assessment', 'worker/student rights review'],
  },
  biometric_categorisation_sensitive_traits: {
    title: 'Biometric categorisation of sensitive traits',
    articleReference: 'Article 5(1)(g)',
    rationale: 'The system may categorise people from biometric data to infer sensitive or protected characteristics.',
    requiredEvidence: ['biometric-data inventory', 'inferred-traits list', 'purpose limitation', 'fundamental-rights assessment'],
  },
  real_time_remote_biometric_public_space: {
    title: 'Real-time remote biometric identification in public spaces',
    articleReference: 'Article 5(1)(h)',
    rationale: 'The system may perform real-time remote biometric identification in publicly accessible spaces for law-enforcement purposes without a documented exception and authorisation path.',
    requiredEvidence: ['deployment-context record', 'exception analysis', 'prior authorisation', 'necessity and proportionality assessment'],
  },
};

function normalizeAnswer(value: ProhibitedPracticeAnswer | boolean | null | undefined): ProhibitedPracticeAnswer {
  if (value === true || value === 'yes') return 'yes';
  if (value === false || value === 'no') return 'no';
  return 'unknown';
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function assessProhibitedPractices(answers: ProhibitedPracticeAnswers): ProhibitedPracticeAssessment {
  const findings = PROHIBITED_PRACTICE_SIGNALS.map((signal) => ({
    signal,
    answer: normalizeAnswer(answers[signal]),
    ...DEFINITIONS[signal],
  }));
  const positiveSignals = findings.filter((finding) => finding.answer === 'yes').map((finding) => finding.signal);
  const unknownSignals = findings.filter((finding) => finding.answer === 'unknown').map((finding) => finding.signal);
  const disposition: ProhibitedPracticeDisposition = positiveSignals.length > 0
    ? 'blocked_pending_legal_review'
    : unknownSignals.length > 0
      ? 'review_required'
      : 'clear';

  const requiredActions = unique([
    ...(positiveSignals.length > 0
      ? [
          'Block production rollout and new processing until accountable legal/compliance approval is recorded.',
          'Open a prohibited-practice review with an accountable owner and decision deadline.',
          'Preserve the supplied answers, supporting evidence and final decision in the audit trail.',
        ]
      : []),
    ...(unknownSignals.length > 0
      ? ['Resolve every unknown prohibited-practice answer before treating the assessment as complete.']
      : []),
    ...findings
      .filter((finding) => finding.answer !== 'no')
      .flatMap((finding) => finding.requiredEvidence.map((item) => `Collect ${item} for ${finding.articleReference}.`)),
  ]);

  return {
    version: VERSION,
    disposition,
    blockProductionUse: positiveSignals.length > 0,
    legalReviewRequired: positiveSignals.length > 0 || unknownSignals.length > 0,
    positiveSignals,
    unknownSignals,
    findings,
    requiredActions,
    evidenceBoundary: 'Decision support only. A clear result means no prohibited-practice signal was identified from the supplied answers; it is not a legal determination or compliance guarantee.',
  };
}

export const PROHIBITED_PRACTICE_REVIEW_STAGES = [
  'draft',
  'applicability_review',
  'evidence_review',
  'legal_review',
  'approval_pending',
  'approved',
  'blocked',
  'not_applicable',
  'retired',
] as const;

export type ProhibitedPracticeReviewStage = (typeof PROHIBITED_PRACTICE_REVIEW_STAGES)[number];
export type ProhibitedPracticeApplicability = 'required' | 'not_required' | 'uncertain';
export type ProhibitedPracticeLegalConclusion =
  | 'not_prohibited'
  | 'prohibited'
  | 'exception_supported'
  | 'uncertain';

export type ProhibitedPracticeSignalReviewInput = {
  answer?: ProhibitedPracticeAnswer | boolean | null;
  rationaleComplete?: boolean;
  contextDocumented?: boolean;
  evidenceComplete?: boolean;
  reviewerAssigned?: boolean;
  legalConclusion?: ProhibitedPracticeLegalConclusion;
  exceptionClaimed?: boolean;
  exceptionBasisComplete?: boolean;
  authorizationComplete?: boolean;
  necessityAndProportionalityComplete?: boolean;
};

export type ProhibitedPracticeGovernanceInput = {
  applicability: ProhibitedPracticeApplicability;
  intendedPurposeRecorded: boolean;
  deploymentContextsRecorded: boolean;
  affectedPersonsAndGroupsRecorded: boolean;
  systemCapabilitiesRecorded: boolean;
  dataSourcesRecorded: boolean;
  outputsAndConsequencesRecorded: boolean;
  signalReviews: Partial<Record<ProhibitedPracticeSignal, ProhibitedPracticeSignalReviewInput>>;
  openHighFindings: number;
  openCriticalFindings: number;
  accountableOwnerAssigned: boolean;
  independentReviewerAssigned: boolean;
  legalReviewerAssigned: boolean;
  approverAssigned: boolean;
  reviewDigestValid: boolean;
  reviewedAt?: string | null;
  legalReviewedAt?: string | null;
  approvedAt?: string | null;
  lastMaterialChangeAt?: string | null;
  retiredAt?: string | null;
};

export type ProhibitedPracticeGovernanceControl = {
  id: string;
  title: string;
  articleReference: string;
  required: boolean;
  satisfied: boolean;
  blocking: boolean;
};

export type ProhibitedPracticeSignalReviewResult = {
  signal: ProhibitedPracticeSignal;
  answer: ProhibitedPracticeAnswer;
  legalConclusion: ProhibitedPracticeLegalConclusion;
  resolved: boolean;
  prohibited: boolean;
  exceptionSupported: boolean;
  missing: string[];
};

export type ProhibitedPracticeGovernanceDecision = {
  version: string;
  stage: ProhibitedPracticeReviewStage;
  productionUseAllowed: boolean;
  legalReviewRequired: boolean;
  controls: ProhibitedPracticeGovernanceControl[];
  signalResults: ProhibitedPracticeSignalReviewResult[];
  positiveSignals: ProhibitedPracticeSignal[];
  unknownSignals: ProhibitedPracticeSignal[];
  prohibitedSignals: ProhibitedPracticeSignal[];
  exceptionSupportedSignals: ProhibitedPracticeSignal[];
  missingControlIds: string[];
  blockingControlIds: string[];
  requiredActions: string[];
  evidenceBoundary: string;
};

const GOVERNED_VERSION = '2026-07-21.1';

function governedControl(
  id: string,
  title: string,
  articleReference: string,
  required: boolean,
  satisfied: boolean,
  blocking = true,
): ProhibitedPracticeGovernanceControl {
  return { id, title, articleReference, required, satisfied, blocking };
}

function isReviewFresh(reviewedAt?: string | null, lastMaterialChangeAt?: string | null) {
  if (!reviewedAt) return false;
  if (!lastMaterialChangeAt) return true;
  const reviewed = Date.parse(reviewedAt);
  const changed = Date.parse(lastMaterialChangeAt);
  return Number.isFinite(reviewed) && Number.isFinite(changed) && reviewed >= changed;
}

function assessSignalReview(
  signal: ProhibitedPracticeSignal,
  input: ProhibitedPracticeSignalReviewInput | undefined,
): ProhibitedPracticeSignalReviewResult {
  const answer = normalizeAnswer(input?.answer);
  const legalConclusion = input?.legalConclusion ?? 'uncertain';
  const missing: string[] = [];

  if (answer === 'unknown') missing.push('answer');
  if (!input?.rationaleComplete) missing.push('rationale');
  if (!input?.contextDocumented) missing.push('context');
  if (!input?.evidenceComplete) missing.push('evidence');
  if (!input?.reviewerAssigned) missing.push('independent_reviewer');

  if (answer === 'yes') {
    if (legalConclusion === 'uncertain') missing.push('legal_conclusion');
    if (input?.exceptionClaimed) {
      if (!input.exceptionBasisComplete) missing.push('exception_basis');
      if (!input.authorizationComplete) missing.push('authorization');
      if (!input.necessityAndProportionalityComplete) missing.push('necessity_and_proportionality');
      if (legalConclusion !== 'exception_supported') missing.push('exception_legal_conclusion');
    }
  }

  if (answer === 'no' && legalConclusion === 'prohibited') missing.push('inconsistent_legal_conclusion');
  if (legalConclusion === 'exception_supported' && !input?.exceptionClaimed) missing.push('exception_claim');

  const resolved = missing.length === 0
    && answer !== 'unknown'
    && (answer === 'no' || legalConclusion !== 'uncertain');

  return {
    signal,
    answer,
    legalConclusion,
    resolved,
    prohibited: answer === 'yes' && legalConclusion === 'prohibited',
    exceptionSupported: answer === 'yes'
      && Boolean(input?.exceptionClaimed)
      && legalConclusion === 'exception_supported'
      && missing.length === 0,
    missing,
  };
}

export function decideProhibitedPracticesGovernance(
  input: ProhibitedPracticeGovernanceInput,
): ProhibitedPracticeGovernanceDecision {
  const signalResults = PROHIBITED_PRACTICE_SIGNALS.map((signal) =>
    assessSignalReview(signal, input.signalReviews[signal]));
  const positiveSignals = signalResults.filter((item) => item.answer === 'yes').map((item) => item.signal);
  const unknownSignals = signalResults.filter((item) => item.answer === 'unknown').map((item) => item.signal);
  const prohibitedSignals = signalResults.filter((item) => item.prohibited).map((item) => item.signal);
  const exceptionSupportedSignals = signalResults.filter((item) => item.exceptionSupported).map((item) => item.signal);
  const allSignalsResolved = signalResults.every((item) => item.resolved);
  const allPositiveSignalsLegallyResolved = signalResults
    .filter((item) => item.answer === 'yes')
    .every((item) => item.legalConclusion === 'not_prohibited' || item.exceptionSupported);
  const severeFindingsClosed = input.openHighFindings === 0 && input.openCriticalFindings === 0;
  const legalReviewRequired = input.applicability !== 'required'
    || positiveSignals.length > 0
    || unknownSignals.length > 0
    || signalResults.some((item) => item.legalConclusion === 'uncertain');
  const legalReviewComplete = !legalReviewRequired
    || (input.legalReviewerAssigned && Boolean(input.legalReviewedAt));
  const reviewFresh = isReviewFresh(input.reviewedAt, input.lastMaterialChangeAt);
  const approvalRecorded = Boolean(input.approvedAt);

  const controls: ProhibitedPracticeGovernanceControl[] = [
    governedControl('PPG-01', 'Applicability is resolved', 'Article 5', true, input.applicability !== 'uncertain'),
    governedControl('PPG-02', 'Intended purpose is recorded', 'Article 5', true, input.intendedPurposeRecorded),
    governedControl('PPG-03', 'Deployment contexts are recorded', 'Article 5', true, input.deploymentContextsRecorded),
    governedControl('PPG-04', 'Affected persons and groups are recorded', 'Article 5', true, input.affectedPersonsAndGroupsRecorded),
    governedControl('PPG-05', 'System capabilities are recorded', 'Article 5', true, input.systemCapabilitiesRecorded),
    governedControl('PPG-06', 'Data sources are recorded', 'Article 5', true, input.dataSourcesRecorded),
    governedControl('PPG-07', 'Outputs and consequences are recorded', 'Article 5', true, input.outputsAndConsequencesRecorded),
    governedControl('PPG-08', 'Every prohibited-practice signal is resolved', 'Article 5(1)(a)-(h)', input.applicability === 'required', allSignalsResolved),
    governedControl('PPG-09', 'Every positive signal has an accepted legal conclusion', 'Article 5', input.applicability === 'required' && positiveSignals.length > 0, allPositiveSignalsLegallyResolved),
    governedControl('PPG-10', 'No signal has a prohibited legal conclusion', 'Article 5', input.applicability === 'required', prohibitedSignals.length === 0),
    governedControl('PPG-11', 'High and critical findings are closed', 'Article 5 governance', true, severeFindingsClosed),
    governedControl('PPG-12', 'Accountable owner is assigned', 'Governance accountability', true, input.accountableOwnerAssigned),
    governedControl('PPG-13', 'Independent reviewer is assigned', 'Governance review', true, input.independentReviewerAssigned),
    governedControl('PPG-14', 'Required legal review is recorded', 'Article 5 legal review', legalReviewRequired, legalReviewComplete),
    governedControl('PPG-15', 'Independent approver is assigned', 'Governance approval', true, input.approverAssigned),
    governedControl('PPG-16', 'Review is newer than the last material change', 'Change governance', true, reviewFresh),
    governedControl('PPG-17', 'Review integrity digest validates', 'Evidence integrity', true, input.reviewDigestValid),
    governedControl('PPG-18', 'Approval decision is recorded', 'Governance approval', input.applicability !== 'uncertain', approvalRecorded),
    ...signalResults.map((result, index) => governedControl(
      `PPG-S${String(index + 1).padStart(2, '0')}`,
      `${DEFINITIONS[result.signal].title} review is complete`,
      DEFINITIONS[result.signal].articleReference,
      input.applicability === 'required',
      result.resolved,
    )),
  ];

  const requiredControls = controls.filter((item) => item.required);
  const missingControlIds = requiredControls.filter((item) => !item.satisfied).map((item) => item.id);
  const hardBlocked = prohibitedSignals.length > 0
    || !severeFindingsClosed
    || positiveSignals.some((signal) => !signalResults.find((item) => item.signal === signal)?.resolved);

  let stage: ProhibitedPracticeReviewStage;
  if (input.retiredAt) stage = 'retired';
  else if (hardBlocked) stage = 'blocked';
  else if (input.applicability === 'uncertain') stage = 'applicability_review';
  else if (input.applicability === 'not_required') {
    stage = legalReviewComplete && approvalRecorded && reviewFresh && input.reviewDigestValid
      ? 'not_applicable'
      : 'legal_review';
  } else if (!allSignalsResolved || !input.reviewDigestValid || !reviewFresh) stage = 'evidence_review';
  else if (!legalReviewComplete) stage = 'legal_review';
  else if (!approvalRecorded || !input.approverAssigned) stage = 'approval_pending';
  else stage = 'approved';

  const productionUseAllowed = stage === 'approved'
    && prohibitedSignals.length === 0
    && allPositiveSignalsLegallyResolved;

  const requiredActions = unique([
    ...(input.applicability === 'uncertain' ? ['Resolve Article 5 applicability before rollout.'] : []),
    ...(unknownSignals.length > 0 ? ['Resolve every unknown prohibited-practice signal.'] : []),
    ...(prohibitedSignals.length > 0 ? ['Keep production use blocked and record the prohibited-practice decision.'] : []),
    ...signalResults
      .filter((result) => !result.resolved)
      .map((result) => `Complete ${DEFINITIONS[result.signal].articleReference} review: ${result.missing.join(', ')}.`),
    ...(!severeFindingsClosed ? ['Close or formally reject every open high and critical finding.'] : []),
    ...(legalReviewRequired && !legalReviewComplete ? ['Record accountable legal review and its timestamp.'] : []),
    ...(!reviewFresh ? ['Re-review the assessment after the latest material system change.'] : []),
    ...(!input.reviewDigestValid ? ['Generate and validate the immutable review digest.'] : []),
    ...(!input.accountableOwnerAssigned ? ['Assign an accountable owner.'] : []),
    ...(!input.independentReviewerAssigned ? ['Assign an independent reviewer.'] : []),
    ...(!input.approverAssigned ? ['Assign an approver distinct from owner and reviewer.'] : []),
    ...(!approvalRecorded && input.applicability !== 'uncertain' ? ['Record an approval or non-applicability decision.'] : []),
  ]);

  return {
    version: GOVERNED_VERSION,
    stage,
    productionUseAllowed,
    legalReviewRequired,
    controls,
    signalResults,
    positiveSignals,
    unknownSignals,
    prohibitedSignals,
    exceptionSupportedSignals,
    missingControlIds,
    blockingControlIds: requiredControls.filter((item) => !item.satisfied && item.blocking).map((item) => item.id),
    requiredActions,
    evidenceBoundary: 'Governed Article 5 decision support only. A recorded approval organizes evidence and accountable review; it is not a regulator decision, legal opinion, certification or guarantee that a practice is lawful.',
  };
}
