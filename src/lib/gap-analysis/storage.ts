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
  workspaceId: string;
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
      workspace_id: input.workspaceId,
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
          workspace_id: input.workspaceId,
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

export async function loadLatestGapAssessment(workspaceId: string) {
  const { data, error } = await supabase
    .from('gap_assessments')
    .select('id, score, status, locale, summary, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function tryLoadLatestGapAssessment(workspaceId: string) {
  try {
    return await loadLatestGapAssessment(workspaceId);
  } catch {
    return null;
  }
}

export async function loadGapAssessmentHistory(workspaceId: string, limit = 10) {
  const { data, error } = await supabase
    .from('gap_assessments')
    .select('id, score, status, locale, summary, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function tryLoadGapAssessmentHistory(workspaceId: string, limit = 10) {
  try {
    return await loadGapAssessmentHistory(workspaceId, limit);
  } catch {
    return [];
  }
}
