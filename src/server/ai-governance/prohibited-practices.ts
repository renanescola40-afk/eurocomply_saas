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
