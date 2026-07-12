import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const raw = readFileSync(new URL('../../src/messages/fr.json', import.meta.url), 'utf8');

describe('French product copy quality', () => {
  it('avoids unsupported outcome claims', () => {
    expect(raw).not.toMatch(/73\s*%|40\s*h\/mois|essai gratuit de 14 jours/i);
    expect(raw).not.toMatch(/conforme RGPD|journal d[’']audit immuable/i);
  });

  it('avoids unproven enterprise scope', () => {
    expect(raw).not.toMatch(/pays illimités|ISO 27001 en préparation|modules DORA|NIS2/i);
    expect(raw).toContain('SLA défini par contrat');
    expect(raw).toContain('Modules de préparation à l’AI Act');
  });

  it('uses professional native French terminology', () => {
    expect(raw).toContain('Préparation des preuves');
    expect(raw).toContain('Espace de travail créé avec succès.');
    expect(raw).toContain('Intégration accompagnée');
    expect(raw).not.toMatch(/workspace|onboarding|audit packs|white-label|versioning/i);
  });
});
