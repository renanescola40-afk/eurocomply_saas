import { createAdminClient } from '@/lib/supabase/admin';

import type { CounselDecision, LegalReviewStatus } from '@/server/legal-assurance/core';

type RpcResult = {
  outcome: string;
  review_status?: LegalReviewStatus | null;
  review_updated_at?: string | null;
  [key: string]: unknown;
};

export type LegalReviewPackageRecord = {
  id: string;
  review_id: string;
  package_version: number;
  product_release_sha: string;
  methodology_version: string;
  regulatory_rules_version: string;
  manifest: Record<string, unknown>;
  package_manifest_digest: string;
  created_at: string;
  finalized_at: string | null;
};

export type LegalReviewMatterData = {
  packages: Array<Record<string, unknown>>;
  packageItems: Array<Record<string, unknown>>;
  decisions: Array<Record<string, unknown>>;
  remediation: Array<Record<string, unknown>>;
  informationRequests: Array<Record<string, unknown>>;
  informationResponses: Array<Record<string, unknown>>;
  artifacts: Array<Record<string, unknown>>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function actorColumns(userId: string): { user: string | null; clerk: string | null } {
  return isUuid(userId) ? { user: userId, clerk: null } : { user: null, clerk: userId };
}

function fail(area: string, error?: { code?: string | null } | null): never {
  console.warn('[legal-assurance] review_storage_failure', { area, code: error?.code ?? 'unknown' });
  throw new Error('legal_assurance_storage_unavailable');
}

function oneRpcRow<T extends RpcResult>(value: unknown, area: string): T {
  const row = Array.isArray(value) && value.length === 1 && value[0] && typeof value[0] === 'object'
    ? value[0] as T
    : null;
  if (!row || typeof row.outcome !== 'string') throw new Error(`legal_assurance_${area}_invalid_result`);
  return row;
}

export async function getLegalReviewMatterData(reviewId: string): Promise<LegalReviewMatterData> {
  const db = createAdminClient();

  const [packagesResult, decisionsResult, remediationResult, informationResult, artifactsResult] = await Promise.all([
    db.from('legal_review_packages').select('*').eq('review_id', reviewId).order('package_version', { ascending: true }),
    db.from('legal_review_decisions').select('*').eq('review_id', reviewId).order('issued_at', { ascending: true }),
    db.from('legal_review_remediation_items').select('*').eq('review_id', reviewId).order('created_at', { ascending: true }),
    db.from('legal_review_information_requests').select('*').eq('review_id', reviewId).order('created_at', { ascending: true }),
    db.from('legal_review_artifacts').select('*').eq('review_id', reviewId).order('issued_at', { ascending: true }),
  ]);

  for (const [area, result] of [
    ['packages', packagesResult],
    ['decisions', decisionsResult],
    ['remediation', remediationResult],
    ['information_requests', informationResult],
    ['artifacts', artifactsResult],
  ] as const) {
    if (result.error) fail(area, result.error);
  }

  const packages = (packagesResult.data ?? []) as Array<Record<string, unknown>>;
  const informationRequests = (informationResult.data ?? []) as Array<Record<string, unknown>>;
  const packageIds = packages.map((row) => String(row.id));
  const informationRequestIds = informationRequests.map((row) => String(row.id));

  const packageItemsResult = packageIds.length > 0
    ? await db.from('legal_review_package_items').select('*').in('package_id', packageIds).order('captured_at', { ascending: true })
    : { data: [], error: null };
  if (packageItemsResult.error) fail('package_items', packageItemsResult.error);

  const informationResponsesResult = informationRequestIds.length > 0
    ? await db.from('legal_review_information_responses').select('*').in('information_request_id', informationRequestIds).order('created_at', { ascending: true })
    : { data: [], error: null };
  if (informationResponsesResult.error) fail('information_responses', informationResponsesResult.error);

  return {
    packages,
    packageItems: (packageItemsResult.data ?? []) as Array<Record<string, unknown>>,
    decisions: (decisionsResult.data ?? []) as Array<Record<string, unknown>>,
    remediation: (remediationResult.data ?? []) as Array<Record<string, unknown>>,
    informationRequests,
    informationResponses: (informationResponsesResult.data ?? []) as Array<Record<string, unknown>>,
    artifacts: (artifactsResult.data ?? []) as Array<Record<string, unknown>>,
  };
}

export async function getLatestFinalizedLegalReviewPackage(reviewId: string): Promise<LegalReviewPackageRecord | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('legal_review_packages')
    .select('id,review_id,package_version,product_release_sha,methodology_version,regulatory_rules_version,manifest,package_manifest_digest,created_at,finalized_at')
    .eq('review_id', reviewId)
    .not('finalized_at', 'is', null)
    .order('package_version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail('latest_package', error);
  return data as unknown as LegalReviewPackageRecord | null;
}

export async function createLegalReviewPackageAtomic(input: {
  reviewId: string;
  expectedUpdatedAt: string;
  productReleaseSha: string;
  methodologyVersion: string;
  regulatoryRulesVersion: string;
  manifest: Record<string, unknown>;
  packageManifestDigest: string;
  items: Array<Record<string, unknown>>;
  createdBy: string;
}) {
  const db = createAdminClient();
  const actor = actorColumns(input.createdBy);
  const { data, error } = await db.rpc('create_legal_review_package_atomic', {
    p_review_id: input.reviewId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_product_release_sha: input.productReleaseSha,
    p_methodology_version: input.methodologyVersion,
    p_regulatory_rules_version: input.regulatoryRulesVersion,
    p_manifest: input.manifest,
    p_package_manifest_digest: input.packageManifestDigest,
    p_items: input.items,
    p_created_by_user_id: actor.user,
    p_created_by_clerk_user_id: actor.clerk,
  });
  if (error) fail('package_create_atomic', error);
  return oneRpcRow<RpcResult>(data, 'package_create');
}

export async function requestLegalReviewInformationAtomic(input: {
  reviewId: string;
  expectedUpdatedAt: string;
  counselProfileId: string;
  prompt: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('request_legal_review_information_atomic', {
    p_review_id: input.reviewId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_counsel_profile_id: input.counselProfileId,
    p_prompt: input.prompt,
  });
  if (error) fail('information_request_atomic', error);
  return oneRpcRow<RpcResult>(data, 'information_request');
}

export async function respondLegalReviewInformationAtomic(input: {
  reviewId: string;
  expectedUpdatedAt: string;
  informationRequestId: string;
  organizationId: string;
  response: Record<string, unknown>;
  submittedBy: string;
}) {
  const db = createAdminClient();
  const actor = actorColumns(input.submittedBy);
  const { data, error } = await db.rpc('respond_legal_review_information_atomic', {
    p_review_id: input.reviewId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_information_request_id: input.informationRequestId,
    p_organization_id: input.organizationId,
    p_response: input.response,
    p_submitted_by_user_id: actor.user,
    p_submitted_by_clerk_user_id: actor.clerk,
  });
  if (error) fail('information_response_atomic', error);
  return oneRpcRow<RpcResult>(data, 'information_response');
}

export async function issueLegalReviewDecisionAtomic(input: {
  reviewId: string;
  expectedUpdatedAt: string;
  counselProfileId: string;
  decision: CounselDecision;
  scope: Record<string, unknown>;
  jurisdiction: string;
  rationale: string;
  conditions: unknown[];
  exclusions: unknown[];
  validUntil: string | null;
  signedArtifactReference: string | null;
  decisionDigest: string;
  remediationItems: Array<Record<string, unknown>>;
}) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('issue_legal_review_decision_atomic', {
    p_review_id: input.reviewId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_counsel_profile_id: input.counselProfileId,
    p_decision: input.decision,
    p_scope: input.scope,
    p_jurisdiction: input.jurisdiction,
    p_rationale: input.rationale,
    p_conditions: input.conditions,
    p_exclusions: input.exclusions,
    p_valid_until: input.validUntil,
    p_signed_artifact_reference: input.signedArtifactReference,
    p_decision_digest: input.decisionDigest,
    p_remediation_items: input.remediationItems,
  });
  if (error) fail('decision_issue_atomic', error);
  return oneRpcRow<RpcResult>(data, 'decision_issue');
}

export async function updateLegalReviewRemediationAtomic(input: {
  reviewId: string;
  organizationId: string;
  remediationId: string;
  expectedReviewUpdatedAt: string;
  customerResponse: Record<string, unknown>;
  markReady: boolean;
}) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('update_legal_review_remediation_atomic', {
    p_review_id: input.reviewId,
    p_organization_id: input.organizationId,
    p_remediation_id: input.remediationId,
    p_expected_review_updated_at: input.expectedReviewUpdatedAt,
    p_customer_response: input.customerResponse,
    p_mark_ready: input.markReady,
  });
  if (error) fail('remediation_update_atomic', error);
  return oneRpcRow<RpcResult>(data, 'remediation_update');
}

export async function resubmitLegalReviewAtomic(input: {
  reviewId: string;
  organizationId: string;
  expectedUpdatedAt: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('resubmit_legal_review_atomic', {
    p_review_id: input.reviewId,
    p_organization_id: input.organizationId,
    p_expected_updated_at: input.expectedUpdatedAt,
  });
  if (error) fail('review_resubmit_atomic', error);
  return oneRpcRow<RpcResult>(data, 'review_resubmit');
}
