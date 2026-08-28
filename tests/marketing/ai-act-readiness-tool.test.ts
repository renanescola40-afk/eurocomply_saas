import { describe, expect, it } from 'vitest';

import {
  AI_ACT_READINESS_QUESTIONS,
  buildReadinessShareText,
  scoreAiActReadiness,
  type ReadinessAnswer,
} from '@/lib/marketing/free-tools/ai-act-readiness';

function answers(value: ReadinessAnswer) {
  return Object.fromEntries(AI_ACT_READINESS_QUESTIONS.map((question) => [question.id, value]));
}

describe('EU AI Act readiness assessment', () => {
  it('keeps the eight-dimension operational contract stable', () => {
    expect(AI_ACT_READINESS_QUESTIONS).toHaveLength(8);
    expect(new Set(AI_ACT_READINESS_QUESTIONS.map((question) => question.id)).size).toBe(8);
  });

  it('scores all not-yet answers as 0', () => {
    const result = scoreAiActReadiness(answers(0));
    expect(result.score).toBe(0);
    expect(result.level).toBe('Foundation needed');
    expect(result.answered).toBe(8);
  });

  it('scores all partly answers as 50', () => {
    const result = scoreAiActReadiness(answers(1));
    expect(result.score).toBe(50);
    expect(result.level).toBe('Developing');
  });

  it('scores all in-place answers as 100', () => {
    const result = scoreAiActReadiness(answers(2));
    expect(result.score).toBe(100);
    expect(result.level).toBe('Stronger readiness baseline');
    expect(result.priorities).toHaveLength(0);
  });

  it('prioritizes missing controls before partial controls', () => {
    const input = answers(2);
    input.inventory = 1;
    input.transparency = 0;
    input['vendor-governance'] = 0;
    const result = scoreAiActReadiness(input);
    expect(result.priorities.slice(0, 2).map((item) => item.answer)).toEqual([0, 0]);
  });

  it('keeps copied output privacy-safe and non-legal', () => {
    const text = buildReadinessShareText(scoreAiActReadiness(answers(1)));
    expect(text).toContain('50/100');
    expect(text).toContain('not a legal compliance determination');
    expect(text).not.toMatch(/email|company name|person/i);
  });
});
