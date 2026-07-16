import { describe, expect, it } from 'vitest';

import {
  aiSystemEditCopy,
  aiSystemEditLocales,
  getAiSystemEditCopy,
} from '../../src/app/[locale]/ai-systems/[id]/ai-system-edit-copy';

describe('AI reassessment localization', () => {
  it('covers every supported product locale with complete option labels', () => {
    expect(aiSystemEditLocales).toEqual(['en', 'pt', 'es', 'fr', 'it', 'de']);

    for (const locale of aiSystemEditLocales) {
      const copy = aiSystemEditCopy[locale];
      expect(copy.editTitle.length).toBeGreaterThan(3);
      expect(copy.saveError.length).toBeGreaterThan(3);
      expect(Object.keys(copy.roleLabels)).toHaveLength(5);
      expect(Object.keys(copy.statusLabels)).toHaveLength(4);
      expect(Object.keys(copy.domainLabels)).toHaveLength(13);
      expect(Object.keys(copy.riskLevelLabels)).toHaveLength(4);
      expect(Object.keys(copy.riskSignalLabels)).toHaveLength(5);
      expect(Object.keys(copy.executiveSignalLabels)).toHaveLength(6);
    }
  });

  it('does not silently serve the English form for supported non-English locales', () => {
    for (const locale of ['pt', 'es', 'fr', 'it', 'de'] as const) {
      expect(aiSystemEditCopy[locale].editTitle).not.toBe(aiSystemEditCopy.en.editTitle);
      expect(aiSystemEditCopy[locale].saveReassessment).not.toBe(aiSystemEditCopy.en.saveReassessment);
      expect(aiSystemEditCopy[locale].domainLabels.general_productivity).not.toBe(
        aiSystemEditCopy.en.domainLabels.general_productivity,
      );
    }
  });

  it('falls back to English only for unknown locales', () => {
    expect(getAiSystemEditCopy('fr')).toBe(aiSystemEditCopy.fr);
    expect(getAiSystemEditCopy('unknown')).toBe(aiSystemEditCopy.en);
    expect(getAiSystemEditCopy()).toBe(aiSystemEditCopy.en);
  });
});
