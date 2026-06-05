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
