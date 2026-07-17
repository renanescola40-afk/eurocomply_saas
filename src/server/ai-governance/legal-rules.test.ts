import { describe, expect, it } from 'vitest';
import {
  AI_ACT_LEGAL_RULES,
  getAiActRule,
  listApplicableAiActRules,
  validateAiActLegalRules,
  type AiActLegalRule,
} from './legal-rules';

describe('EU AI Act legal rules registry', () => {
  it('contains only internally valid, officially sourced rules', () => {
    expect(AI_ACT_LEGAL_RULES.length).toBeGreaterThanOrEqual(8);
    expect(validateAiActLegalRules()).toEqual([]);
    expect(AI_ACT_LEGAL_RULES.every((rule) => rule.regulation === 'Regulation (EU) 2024/1689')).toBe(true);
    expect(AI_ACT_LEGAL_RULES.every((rule) => rule.version && rule.source.verifiedAt && rule.reviewBy)).toBe(true);
  });

  it('returns rules by stable identifier', () => {
    expect(getAiActRule('eu-ai-act-art4-ai-literacy')?.article).toBe('Article 4');
    expect(getAiActRule('missing-rule')).toBeNull();
  });

  it('filters applicable rules by role, category and application date', () => {
    const deployerRules = listApplicableAiActRules({
      roles: ['deployer'],
      onDate: '2026-07-17',
    });

    expect(deployerRules.map((rule) => rule.id)).toEqual(expect.arrayContaining([
      'eu-ai-act-art4-ai-literacy',
      'eu-ai-act-art5-prohibited-practices',
    ]));
    expect(deployerRules.some((rule) => rule.id === 'eu-ai-act-art50-general-transparency')).toBe(false);
    expect(deployerRules.some((rule) => rule.category === 'gpai')).toBe(false);

    const transparencyRules = listApplicableAiActRules({
      roles: ['deployer'],
      categories: ['transparency'],
      onDate: '2026-08-02',
    });

    expect(transparencyRules.map((rule) => rule.id)).toEqual(expect.arrayContaining([
      'eu-ai-act-art50-general-transparency',
      'eu-ai-act-art50-preexisting-synthetic-transition',
    ]));
  });

  it('can include future rules for implementation planning', () => {
    const futureRules = listApplicableAiActRules({
      roles: ['provider'],
      onDate: '2026-07-17',
      includeFuture: true,
    });

    expect(futureRules.some((rule) => rule.id === 'eu-ai-act-high-risk-standalone-2027')).toBe(true);
  });

  it('fails closed for duplicate ids, invalid sources and broken supersession links', () => {
    const base = AI_ACT_LEGAL_RULES[0];
    const invalidRule: AiActLegalRule = {
      ...base,
      id: base.id,
      source: { ...base.source, url: 'https://example.com/unofficial' },
      status: 'superseded',
      supersededBy: 'missing-rule',
      reviewBy: '2024-01-01',
    };

    const issues = validateAiActLegalRules([base, invalidRule]);
    const fields = issues.map((issue) => issue.field);

    expect(fields).toEqual(expect.arrayContaining(['id', 'source.url', 'supersededBy', 'reviewBy']));
  });
});
