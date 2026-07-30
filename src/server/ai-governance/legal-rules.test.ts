import { describe, expect, it } from 'vitest';
import {
  AI_ACT_LEGAL_RULES,
  AI_ACT_LEGAL_RULES_VERSION,
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
    expect(AI_ACT_LEGAL_RULES.every((rule) => rule.version === AI_ACT_LEGAL_RULES_VERSION)).toBe(true);
    expect(AI_ACT_LEGAL_RULES.every((rule) => rule.source.verifiedAt && rule.reviewBy)).toBe(true);
  });

  it('returns rules by stable identifier', () => {
    expect(getAiActRule('eu-ai-act-art4-ai-literacy')?.article).toBe('Article 4');
    expect(getAiActRule('missing-rule')).toBeNull();
  });

  it('filters applicable rules by role, category and application date', () => {
    const deployerRules = listApplicableAiActRules({
      roles: ['deployer'],
      onDate: '2026-07-30',
    });

    expect(deployerRules.map((rule) => rule.id)).toEqual(expect.arrayContaining([
      'eu-ai-act-art4-ai-literacy',
      'eu-ai-act-art5-prohibited-practices',
    ]));
    expect(deployerRules.some((rule) => rule.id === 'eu-ai-act-art50-general-transparency')).toBe(false);
    expect(deployerRules.some((rule) => rule.id === 'eu-ai-act-art5-intimate-content-amendment')).toBe(false);
    expect(deployerRules.some((rule) => rule.category === 'gpai')).toBe(false);

    const transparencyRules = listApplicableAiActRules({
      roles: ['provider'],
      categories: ['transparency'],
      onDate: '2026-08-02',
    });

    expect(transparencyRules.map((rule) => rule.id)).toEqual(expect.arrayContaining([
      'eu-ai-act-art50-general-transparency',
      'eu-ai-act-art50-preexisting-synthetic-transition',
    ]));
  });

  it('activates the 2026/1744 Article 5 amendments only on their statutory application date', () => {
    const rule = getAiActRule('eu-ai-act-art5-intimate-content-amendment');

    expect(rule).toMatchObject({
      sourceRegulation: 'Regulation (EU) 2026/1744',
      appliesFrom: '2026-12-02',
      applicationDateStatus: 'confirmed',
      status: 'active',
    });
    expect(rule?.source.url).toContain('/2026/1744/');
    expect(rule?.source.publishedAt).toBe('2026-07-24');

    const beforeApplication = listApplicableAiActRules({
      roles: ['provider'],
      categories: ['prohibited_practice'],
      onDate: '2026-12-01',
    });
    const onApplication = listApplicableAiActRules({
      roles: ['provider'],
      categories: ['prohibited_practice'],
      onDate: '2026-12-02',
    });

    expect(beforeApplication.some((candidate) => candidate.id === rule?.id)).toBe(false);
    expect(onApplication.some((candidate) => candidate.id === rule?.id)).toBe(true);
  });

  it('keeps the Article 50 transition provider-only and tied to Article 50(2)', () => {
    const providerRules = listApplicableAiActRules({
      roles: ['provider'],
      categories: ['transparency'],
      onDate: '2026-08-02',
    });
    const deployerRules = listApplicableAiActRules({
      roles: ['deployer'],
      categories: ['transparency'],
      onDate: '2026-08-02',
    });

    expect(providerRules.some((rule) => rule.id === 'eu-ai-act-art50-preexisting-synthetic-transition')).toBe(true);
    expect(deployerRules.some((rule) => rule.id === 'eu-ai-act-art50-preexisting-synthetic-transition')).toBe(false);
  });

  it('can include future rules for implementation planning', () => {
    const futureRules = listApplicableAiActRules({
      roles: ['provider'],
      onDate: '2026-07-30',
      includeFuture: true,
    });

    expect(futureRules.some((rule) => rule.id === 'eu-ai-act-art5-intimate-content-amendment')).toBe(true);
    expect(futureRules.some((rule) => rule.id === 'eu-ai-act-high-risk-standalone-2027')).toBe(true);
  });

  it('fails closed for duplicate ids, invalid sources and broken supersession links', () => {
    const base = AI_ACT_LEGAL_RULES[0];
    const invalidRule: AiActLegalRule = {
      ...base,
      id: base.id,
      sourceRegulation: 'Regulation (EU) 2026/1744',
      source: {
        ...base.source,
        url: 'https://example.com/unofficial',
        publishedAt: '2026-07-25',
      },
      status: 'superseded',
      supersededBy: 'missing-rule',
      reviewBy: '2024-01-01',
    };

    const issues = validateAiActLegalRules([base, invalidRule]);
    const fields = issues.map((issue) => issue.field);

    expect(fields).toEqual(expect.arrayContaining([
      'id',
      'source.url',
      'source.publishedAt',
      'supersededBy',
      'reviewBy',
    ]));
  });
});
