import { supabase } from '@/integrations/supabase/client';

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
    lower.includes('permission denied')
  );
}

export async function saveGapAssessment(input: GapAssessmentInput) {
  const { data: assessment, error: assessmentError } = await supabase
    .from('gap_assessments')
    .insert({
      workspace_id: input.workspaceId || null,
      user_id: input.userId,
      locale: input.locale,
      score: input.score,
      status: 'completed',
      summary: input.summary,
    })
    .select('id')
    .single();

  if (assessmentError) throw assessmentError;
  if (!assessment?.id) throw new Error('Gap assessment was not created');

  if (input.answers.length > 0) {
    const { error: answersError } = await supabase
      .from('gap_answers')
      .insert(
        input.answers.map((answer) => ({
          assessment_id: assessment.id,
          workspace_id: input.workspaceId || null,
          ...answer,
        }))
      );

    if (answersError) throw answersError;
  }

  return assessment.id as string;
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

export async function loadLatestGapAssessment(params: { workspaceId?: string | null; userId?: string | null }) {
  let query = supabase
    .from('gap_assessments')
    .select('id, score, status, locale, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (params.workspaceId) {
    query = query.eq('workspace_id', params.workspaceId);
  } else if (params.userId) {
    query = query.eq('user_id', params.userId);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

export async function tryLoadLatestGapAssessment(params: { workspaceId?: string | null; userId?: string | null }) {
  try {
    return await loadLatestGapAssessment(params);
  } catch {
    return null;
  }
}

export async function loadGapAssessmentHistory(params: { workspaceId?: string | null; userId?: string | null; limit?: number }) {
  let query = supabase
    .from('gap_assessments')
    .select('id, score, status, locale, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 10);

  if (params.workspaceId) {
    query = query.eq('workspace_id', params.workspaceId);
  } else if (params.userId) {
    query = query.eq('user_id', params.userId);
  } else {
    return [];
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function tryLoadGapAssessmentHistory(params: { workspaceId?: string | null; userId?: string | null; limit?: number }) {
  try {
    return await loadGapAssessmentHistory(params);
  } catch {
    return [];
  }
}
