export type ReminderStage = 'due_14d' | 'due_7d' | 'due_1d' | 'overdue' | 'expired';

export interface ReviewDeliveryState {
  assignmentId: string;
  campaignId: string;
  organizationId: string;
  reviewerEmail: string;
  dueAt: string | null;
  validUntil: string | null;
  status: string;
  lastReminderStage?: ReminderStage | null;
}

const DAY = 86_400_000;

export function reminderStageFor(input: ReviewDeliveryState, now = new Date()): ReminderStage | null {
  if (['accepted', 'rejected', 'revoked', 'expired'].includes(input.status)) return null;
  const due = input.dueAt ? new Date(input.dueAt) : null;
  const validUntil = input.validUntil ? new Date(input.validUntil) : null;
  if (validUntil && validUntil <= now) return 'expired';
  if (!due || Number.isNaN(due.valueOf())) return null;
  const remaining = due.valueOf() - now.valueOf();
  if (remaining < 0) return 'overdue';
  if (remaining <= DAY) return 'due_1d';
  if (remaining <= 7 * DAY) return 'due_7d';
  if (remaining <= 14 * DAY) return 'due_14d';
  return null;
}

export function shouldDeliverReminder(input: ReviewDeliveryState, now = new Date()) {
  const stage = reminderStageFor(input, now);
  return { stage, deliver: Boolean(stage && stage !== input.lastReminderStage) };
}

export function evaluateCampaignCloseout(input: {
  targetSha: string;
  assignments: Array<{ workstreamId: string; status: string; weight: number; validUntil?: string | null }>;
  expectedWorkstreams: readonly string[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const failures: string[] = [];
  if (!/^[a-f0-9]{40}$/.test(input.targetSha)) failures.push('exact target SHA is required');
  const byWorkstream = new Map(input.assignments.map((item) => [item.workstreamId, item]));
  for (const workstream of input.expectedWorkstreams) {
    const assignment = byWorkstream.get(workstream);
    if (!assignment) failures.push(`${workstream}: assignment missing`);
    else if (assignment.status !== 'accepted') failures.push(`${workstream}: accepted decision missing`);
    else if (!assignment.validUntil || new Date(assignment.validUntil) <= now) failures.push(`${workstream}: accepted review expired`);
  }
  const completedWeight = input.assignments.filter((item) => item.status === 'accepted' && item.validUntil && new Date(item.validUntil) > now).reduce((sum, item) => sum + item.weight, 0);
  return { ready: failures.length === 0, failures, completedWeight, remainingWeight: Math.max(0, 51 - completedWeight) };
}

export function buildPromotionManifest(input: { campaignId: string; targetSha: string; evidenceDigests: string[]; completedWeight: number }) {
  if (input.completedWeight !== 51) throw new Error('qualified review campaign is incomplete');
  if (!/^[a-f0-9]{40}$/.test(input.targetSha)) throw new Error('exact target SHA is required');
  if (input.evidenceDigests.length < 8 || input.evidenceDigests.some((value) => !/^[a-f0-9]{64}$/.test(value))) throw new Error('eight valid evidence digests are required');
  return { schemaVersion: 1, campaignId: input.campaignId, targetSha: input.targetSha, completedWeight: 51, evidenceDigests: [...input.evidenceDigests].sort(), promotedAt: new Date().toISOString(), humanReviewRequired: false } as const;
}
