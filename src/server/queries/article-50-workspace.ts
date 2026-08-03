import { createAdminClient } from '@/lib/supabase/admin';
import {
  evaluateArticle50Control,
  evaluateArticle50Portfolio,
  type Article50ControlResult,
} from '@/server/ai-governance/article-50-control-plane';

export const ARTICLE_50_LEGAL_SOURCE_VERSION = 'commission-guidelines-2026-07-20';

const SYSTEM_COLUMNS = [
  'id',
  'organization_id',
  'name',
  'use_case',
  'role',
  'interacts_with_people',
  'generates_content',
  'created_at',
  'updated_at',
].join(',');

const ASSESSMENT_COLUMNS = [
  'id',
  'organization_id',
  'ai_system_id',
  'version',
  'status',
  'placed_on_market_at',
  'provider_machine_readable_marking',
  'deployer_disclosure',
  'final_amending_act_verified',
  'official_journal_evidence_id',
  'disclosure_copy',
  'disclosure_language',
  'disclosure_channel',
  'display_evidence_reference',
  'marking_evidence_reference',
  'legal_source_version',
  'evaluation',
  'blockers',
  'warnings',
  'created_by',
  'created_at',
].join(',');

const EVIDENCE_COLUMNS = [
  'id',
  'organization_id',
  'assessment_id',
  'evidence_type',
  'storage_reference',
  'sha256_digest',
  'source_url',
  'environment',
  'status',
  'limitations',
  'valid_until',
  'submitted_by',
  'reviewed_by',
  'reviewed_at',
  'created_at',
].join(',');

const EVENT_COLUMNS = [
  'id',
  'organization_id',
  'assessment_id',
  'event_type',
  'actor_user_id',
  'payload',
  'created_at',
].join(',');

export type Article50SystemRecord = {
  id: string;
  organization_id: string;
  name: string;
  use_case: string;
  role: string;
  interacts_with_people: boolean;
  generates_content: boolean;
  created_at: string;
  updated_at: string;
};

export type Article50AssessmentRecord = {
  id: string;
  organization_id: string;
  ai_system_id: string;
  version: number;
  status: 'BLOCKED' | 'NEEDS_REVIEW' | 'READY';
  placed_on_market_at: string | null;
  provider_machine_readable_marking: boolean;
  deployer_disclosure: boolean;
  final_amending_act_verified: boolean;
  official_journal_evidence_id: string | null;
  disclosure_copy: string | null;
  disclosure_language: string | null;
  disclosure_channel: string | null;
  display_evidence_reference: string | null;
  marking_evidence_reference: string | null;
  legal_source_version: string;
  evaluation: Article50ControlResult;
  blockers: string[];
  warnings: string[];
  created_by: string;
  created_at: string;
};

export type Article50EvidenceRecord = {
  id: string;
  organization_id: string;
  assessment_id: string;
  evidence_type:
    | 'placement_date'
    | 'machine_readable_marking'
    | 'human_readable_disclosure'
    | 'official_journal_source'
    | 'proof_of_display'
    | 'accessibility_validation'
    | 'translation_review';
  storage_reference: string | null;
  sha256_digest: string | null;
  source_url: string | null;
  environment: 'local' | 'ci' | 'staging' | 'production' | 'customer';
  status: 'submitted' | 'accepted' | 'rejected' | 'expired';
  limitations: string[];
  valid_until: string | null;
  submitted_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Article50EventRecord = {
  id: string;
  organization_id: string;
  assessment_id: string;
  event_type: 'assessment_created' | 'evidence_submitted' | 'review_requested' | 'source_changed';
  actor_user_id: string;
  payload: Record<string, unknown>;
  created_at: string;
};

function storageFailure(area: string, error?: { code?: string } | null): never {
  console.warn('[article50] storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('article50_storage_unavailable');
}

function singleRecord<T>(value: unknown, area: string): T {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    storageFailure(`${area}_invalid_response`);
  }
  return candidate as T;
}

export async function listArticle50Workspace(organizationId: string) {
  const db = createAdminClient();
  const [systemsResult, assessmentsResult, evidenceResult, eventsResult] = await Promise.all([
    db.from('ai_systems').select(SYSTEM_COLUMNS).eq('organization_id', organizationId).order('updated_at', { ascending: false }),
    db.from('ai_article50_assessments').select(ASSESSMENT_COLUMNS).eq('organization_id', organizationId).order('version', { ascending: false }),
    db.from('ai_article50_evidence').select(EVIDENCE_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200),
    db.from('ai_article50_events').select(EVENT_COLUMNS).eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200),
  ]);

  if (systemsResult.error) storageFailure('systems_list', systemsResult.error);
  if (assessmentsResult.error) storageFailure('assessments_list', assessmentsResult.error);
  if (evidenceResult.error) storageFailure('evidence_list', evidenceResult.error);
  if (eventsResult.error) storageFailure('events_list', eventsResult.error);

  const systems = (systemsResult.data ?? []) as unknown as Article50SystemRecord[];
  const assessments = (assessmentsResult.data ?? []) as unknown as Article50AssessmentRecord[];
  const evidence = (evidenceResult.data ?? []) as unknown as Article50EvidenceRecord[];
  const events = (eventsResult.data ?? []) as unknown as Article50EventRecord[];
  const latestBySystem = new Map<string, Article50AssessmentRecord>();

  for (const assessment of assessments) {
    if (!latestBySystem.has(assessment.ai_system_id)) {
      latestBySystem.set(assessment.ai_system_id, assessment);
    }
  }

  const portfolio = evaluateArticle50Portfolio(
    systems.map((system) => {
      const latest = latestBySystem.get(system.id);
      return {
        systemId: system.id,
        systemName: system.name,
        placedOnMarketAt: latest?.placed_on_market_at ?? null,
        providerMachineReadableMarking: latest?.provider_machine_readable_marking ?? false,
        deployerDisclosure: latest?.deployer_disclosure ?? false,
        finalAmendingActVerifiedInOfficialJournal: latest?.final_amending_act_verified ?? false,
        officialJournalEvidenceId: latest?.official_journal_evidence_id ?? null,
        evaluatedAt: latest?.created_at,
      };
    }),
  );

  return {
    systems,
    assessments,
    latestAssessments: Object.fromEntries(latestBySystem.entries()),
    evidence,
    events,
    portfolio,
    legalSourceVersion: ARTICLE_50_LEGAL_SOURCE_VERSION,
  };
}

export async function createArticle50AssessmentVersion(input: {
  organizationId: string;
  actorUserId: string;
  systemId: string;
  systemName: string;
  placedOnMarketAt: string | null;
  providerMachineReadableMarking: boolean;
  deployerDisclosure: boolean;
  finalAmendingActVerifiedInOfficialJournal: boolean;
  officialJournalEvidenceId?: string | null;
  disclosureCopy?: string | null;
  disclosureLanguage?: string | null;
  disclosureChannel?: string | null;
  displayEvidenceReference?: string | null;
  markingEvidenceReference?: string | null;
}) {
  const evaluation = evaluateArticle50Control({
    systemId: input.systemId,
    systemName: input.systemName,
    placedOnMarketAt: input.placedOnMarketAt,
    providerMachineReadableMarking: input.providerMachineReadableMarking,
    deployerDisclosure: input.deployerDisclosure,
    finalAmendingActVerifiedInOfficialJournal:
      input.finalAmendingActVerifiedInOfficialJournal,
    officialJournalEvidenceId: input.officialJournalEvidenceId,
  });

  const db = createAdminClient();
  const { data, error } = await db.rpc('create_article50_assessment_version', {
    p_organization_id: input.organizationId,
    p_ai_system_id: input.systemId,
    p_actor_user_id: input.actorUserId,
    p_status: evaluation.status,
    p_placed_on_market_at: input.placedOnMarketAt,
    p_provider_machine_readable_marking: input.providerMachineReadableMarking,
    p_deployer_disclosure: input.deployerDisclosure,
    p_final_amending_act_verified: input.finalAmendingActVerifiedInOfficialJournal,
    p_official_journal_evidence_id: input.officialJournalEvidenceId ?? null,
    p_disclosure_copy: input.disclosureCopy ?? null,
    p_disclosure_language: input.disclosureLanguage ?? null,
    p_disclosure_channel: input.disclosureChannel ?? null,
    p_display_evidence_reference: input.displayEvidenceReference ?? null,
    p_marking_evidence_reference: input.markingEvidenceReference ?? null,
    p_legal_source_version: ARTICLE_50_LEGAL_SOURCE_VERSION,
    p_evaluation: evaluation,
    p_blockers: evaluation.blockers,
    p_warnings: evaluation.warnings,
  });

  if (error) storageFailure('assessment_create', error);
  return singleRecord<Article50AssessmentRecord>(data, 'assessment_create');
}

export async function getArticle50Assessment(
  organizationId: string,
  assessmentId: string,
) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('ai_article50_assessments')
    .select(ASSESSMENT_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('id', assessmentId)
    .maybeSingle();
  if (error) storageFailure('assessment_get', error);
  return data as unknown as Article50AssessmentRecord | null;
}

export async function createArticle50Evidence(input: {
  organizationId: string;
  assessmentId: string;
  actorUserId: string;
  evidenceType: Article50EvidenceRecord['evidence_type'];
  storageReference?: string | null;
  sha256Digest?: string | null;
  sourceUrl?: string | null;
  environment: Article50EvidenceRecord['environment'];
  limitations: string[];
  validUntil?: string | null;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('ai_article50_evidence')
    .insert({
      organization_id: input.organizationId,
      assessment_id: input.assessmentId,
      evidence_type: input.evidenceType,
      storage_reference: input.storageReference ?? null,
      sha256_digest: input.sha256Digest ?? null,
      source_url: input.sourceUrl ?? null,
      environment: input.environment,
      limitations: input.limitations,
      valid_until: input.validUntil ?? null,
      submitted_by: input.actorUserId,
    })
    .select(EVIDENCE_COLUMNS)
    .single();
  if (error) storageFailure('evidence_create', error);

  const evidence = data as unknown as Article50EvidenceRecord;
  const event = await db.from('ai_article50_events').insert({
    organization_id: input.organizationId,
    assessment_id: input.assessmentId,
    event_type: 'evidence_submitted',
    actor_user_id: input.actorUserId,
    payload: {
      evidenceId: evidence.id,
      evidenceType: evidence.evidence_type,
      environment: evidence.environment,
    },
  });
  if (event.error) {
    await db
      .from('ai_article50_evidence')
      .delete()
      .eq('organization_id', input.organizationId)
      .eq('id', evidence.id);
    storageFailure('evidence_event_create', event.error);
  }
  return evidence;
}

export async function rollbackArticle50Assessment(
  organizationId: string,
  assessmentId: string,
) {
  const db = createAdminClient();
  await db
    .from('ai_article50_events')
    .delete()
    .eq('organization_id', organizationId)
    .eq('assessment_id', assessmentId);
  const result = await db
    .from('ai_article50_assessments')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', assessmentId);
  return !result.error;
}

export async function rollbackArticle50Evidence(
  organizationId: string,
  evidenceId: string,
) {
  const db = createAdminClient();
  await db
    .from('ai_article50_events')
    .delete()
    .eq('organization_id', organizationId)
    .contains('payload', { evidenceId });
  const result = await db
    .from('ai_article50_evidence')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', evidenceId);
  return !result.error;
}
