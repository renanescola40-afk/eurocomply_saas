export type GapAnswerValue = 'yes' | 'partial' | 'no';

export type GapAnswerInput = {
  question_id: string;
  article: string;
  category: string;
  answer: GapAnswerValue;
  score: 0 | 50 | 100;
  recommendation?: string;
};

export type GapAssessmentInput = {
  workspaceId?: string | null;
  userId: string;
  locale: string;
  score: number;
  summary: Record<string, unknown>;
  answers: GapAnswerInput[];
};

export type GapPersistenceResult =
  | { ok: true; assessmentId: string }
  | { ok: false; error: string; recoverable: boolean };

type LatestGapAssessment = {
  id: string;
  score: number;
  status: string;
  locale: string;
  summary: Record<string, unknown>;
  created_at: string;
};

function normalizePersistenceError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown persistence error';
}

function isRecoverablePersistenceError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('gap_assessments') ||
    lower.includes('gap_answers') ||
    lower.includes('does not exist') ||
    lower.includes('schema cache') ||
    lower.includes('permission') ||
    lower.includes('commercial') ||
    lower.includes('payment')
  );
}

async function gapApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let error = `Gap Analysis request failed (${response.status})`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) error = body.error;
    } catch {
      // Keep the generic fail-closed error without leaking response bytes.
    }
    throw new Error(error);
  }

  return await response.json() as T;
}

/**
 * Persist through the authenticated commercial API only. userId/workspaceId are
 * retained in the public type for compatibility but are never tenant authority;
 * the server derives identity and organization from the session.
 */
export async function saveGapAssessment(input: GapAssessmentInput) {
  const result = await gapApi<{ assessmentId?: string }>('/api/gap-analysis?operation=assessment', {
    method: 'POST',
    body: JSON.stringify({
      locale: input.locale,
      score: input.score,
      summary: input.summary,
      answers: input.answers,
    }),
  });

  if (!result.assessmentId) throw new Error('Gap assessment was not created');
  return result.assessmentId;
}

export async function trySaveGapAssessment(input: GapAssessmentInput): Promise<GapPersistenceResult> {
  try {
    const assessmentId = await saveGapAssessment(input);
    return { ok: true, assessmentId };
  } catch (error) {
    const message = normalizePersistenceError(error);
    return {
      ok: false,
      error: message,
      recoverable: isRecoverablePersistenceError(message),
    };
  }
}

export async function loadLatestGapAssessment(_params: { workspaceId?: string | null; userId?: string | null }) {
  const result = await gapApi<{ assessment: LatestGapAssessment | null }>('/api/gap-analysis?view=latest');
  return result.assessment;
}

export async function tryLoadLatestGapAssessment(params: { workspaceId?: string | null; userId?: string | null }) {
  try {
    return await loadLatestGapAssessment(params);
  } catch {
    return null;
  }
}

export async function loadGapAssessmentHistory(params: { workspaceId?: string | null; userId?: string | null; limit?: number }) {
  const limit = Math.max(1, Math.min(50, params.limit ?? 10));
  const result = await gapApi<{ assessments: LatestGapAssessment[] }>(`/api/gap-analysis?view=history&limit=${limit}`);
  return result.assessments;
}

export async function tryLoadGapAssessmentHistory(params: { workspaceId?: string | null; userId?: string | null; limit?: number }) {
  try {
    return await loadGapAssessmentHistory(params);
  } catch {
    return [];
  }
}
