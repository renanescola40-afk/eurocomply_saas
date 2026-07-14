export type AiIncidentSeverity = 'monitor' | 'serious' | 'critical';
export type AiIncidentCategory =
  | 'malfunction'
  | 'data_or_security'
  | 'serious_harm'
  | 'fundamental_rights'
  | 'transparency_failure'
  | 'prohibited_use_signal'
  | 'other';
export type AiIncidentReportStatus = 'draft' | 'assessing' | 'reportable' | 'reported' | 'closed';

export type AiIncidentDeadline = {
  label: string;
  dueAt: string | null;
  priority: 'immediate' | 'high' | 'standard';
  description: string;
};

export type AiIncidentTriagePlan = {
  recommendedStatus: AiIncidentReportStatus;
  escalationLevel: 'watch' | 'compliance_review' | 'urgent_review';
  deadlines: AiIncidentDeadline[];
  nextActions: string[];
};

export type AiIncidentDetectedAtResult =
  | { ok: true; value: string }
  | { ok: false; reason: 'invalid_timestamp' | 'future_timestamp' };

const SEVERITIES: AiIncidentSeverity[] = ['monitor', 'serious', 'critical'];
const CATEGORIES: AiIncidentCategory[] = [
  'malfunction',
  'data_or_security',
  'serious_harm',
  'fundamental_rights',
  'transparency_failure',
  'prohibited_use_signal',
  'other',
];
const STATUSES: AiIncidentReportStatus[] = ['draft', 'assessing', 'reportable', 'reported', 'closed'];
const MAX_DETECTED_AT_CLOCK_SKEW_MS = 5 * 60 * 1000;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

export function normalizeAiIncidentSeverity(value: unknown): AiIncidentSeverity {
  return SEVERITIES.includes(value as AiIncidentSeverity) ? (value as AiIncidentSeverity) : 'monitor';
}

export function normalizeAiIncidentCategory(value: unknown): AiIncidentCategory {
  return CATEGORIES.includes(value as AiIncidentCategory) ? (value as AiIncidentCategory) : 'other';
}

export function normalizeAiIncidentReportStatus(value: unknown): AiIncidentReportStatus {
  return STATUSES.includes(value as AiIncidentReportStatus) ? (value as AiIncidentReportStatus) : 'draft';
}

export function serializeAiIncidentLocalDateTime(value: string): string {
  if (!value) return value;

  const localDate = new Date(value);
  return Number.isNaN(localDate.getTime()) ? value : localDate.toISOString();
}

export function parseAiIncidentDetectedAt(
  value: unknown,
  now = new Date(),
): AiIncidentDetectedAtResult {
  if (value === null || value === undefined || value === '') {
    return { ok: true, value: now.toISOString() };
  }

  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    return { ok: false, reason: 'invalid_timestamp' };
  }

  const detectedAt = new Date(value);
  if (detectedAt.getTime() > now.getTime() + MAX_DETECTED_AT_CLOCK_SKEW_MS) {
    return { ok: false, reason: 'future_timestamp' };
  }

  return { ok: true, value: detectedAt.toISOString() };
}

export function buildAiIncidentTriagePlan(input: {
  severity: AiIncidentSeverity;
  category: AiIncidentCategory;
  detectedAt: string;
}): AiIncidentTriagePlan {
  const detected = Number.isNaN(Date.parse(input.detectedAt)) ? new Date() : new Date(input.detectedAt);
  const highImpactCategory = input.category === 'serious_harm' || input.category === 'prohibited_use_signal';

  if (input.severity === 'critical' || highImpactCategory) {
    return {
      recommendedStatus: 'assessing',
      escalationLevel: 'urgent_review',
      deadlines: [
        {
          label: 'Immediate internal escalation',
          dueAt: addDays(detected, 2),
          priority: 'immediate',
          description: 'Escalate to compliance, security, legal and executive owner. Preserve evidence and freeze risky usage if needed.',
        },
        {
          label: 'Authority reporting decision',
          dueAt: addDays(detected, 10),
          priority: 'high',
          description: 'Decide whether the event is reportable and prepare authority review facts, timeline, mitigation and impact assessment.',
        },
        {
          label: 'Final incident package',
          dueAt: addDays(detected, 15),
          priority: 'standard',
          description: 'Complete root-cause analysis, corrective actions and structured incident record.',
        },
      ],
      nextActions: [
        'Assign an incident owner and legal/compliance reviewer.',
        'Preserve prompts, logs, model outputs, user reports and mitigation evidence.',
        'Assess whether the incident created serious harm, rights impact, security impact or prohibited-use exposure.',
        'Prepare a regulator review incident summary before closing the record.',
      ],
    };
  }

  if (input.severity === 'serious') {
    return {
      recommendedStatus: 'assessing',
      escalationLevel: 'compliance_review',
      deadlines: [
        {
          label: 'Compliance triage',
          dueAt: addDays(detected, 5),
          priority: 'high',
          description: 'Review impact, affected users, system role and whether external reporting may be required.',
        },
        {
          label: 'Incident package',
          dueAt: addDays(detected, 15),
          priority: 'standard',
          description: 'Complete documented assessment, mitigations and decision on reportability.',
        },
      ],
      nextActions: [
        'Capture the incident timeline and affected AI system.',
        'Check if the system is high-risk, user-facing or processing personal data.',
        'Document containment, user communication and corrective actions.',
      ],
    };
  }

  return {
    recommendedStatus: 'draft',
    escalationLevel: 'watch',
    deadlines: [
      {
        label: 'Internal review',
        dueAt: addDays(detected, 30),
        priority: 'standard',
        description: 'Review trend, recurrence and whether the event should be escalated.',
      },
    ],
    nextActions: [
      'Keep evidence and monitor recurrence.',
      'Link the event to the relevant AI system if it becomes material.',
      'Escalate if new facts show serious harm, rights impact, security impact or prohibited-use exposure.',
    ],
  };
}
