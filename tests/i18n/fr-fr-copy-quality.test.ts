import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const catalog = JSON.parse(
  readFileSync(new URL('../../src/messages/fr.json', import.meta.url), 'utf8'),
) as unknown;

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(collectStringValues);
  }

  return [];
}

const visibleCopy = collectStringValues(catalog).join('\n');

describe('French product copy quality', () => {
  it('avoids unsupported outcome claims', () => {
    expect(visibleCopy).not.toMatch(/73\s*%|40\s*h\/mois|essai gratuit de 14 jours/i);
    expect(visibleCopy).not.toMatch(/conforme RGPD|journal d[’']audit immuable/i);
  });

  it('avoids unproven enterprise scope', () => {
    expect(visibleCopy).not.toMatch(/pays illimités|ISO 27001 en préparation|modules DORA|NIS2/i);
    expect(visibleCopy).toContain('SLA défini par contrat');
    expect(visibleCopy).toContain('Modules de préparation à l’AI Act');
  });

  it('uses professional native French terminology', () => {
    expect(visibleCopy).toContain('Préparation des preuves');
    expect(visibleCopy).toContain('Espace de travail créé avec succès.');
    expect(visibleCopy).toContain('Intégration accompagnée');
    expect(visibleCopy).not.toMatch(/workspace|onboarding|audit packs|white-label|versioning/i);
  });
});
