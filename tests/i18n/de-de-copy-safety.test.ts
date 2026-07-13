import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type GermanMessages = {
  landing: {
    badge: string;
    heroSubtitle: string;
    badges: { gdpr: string; auditLogs: string; soc: string };
    pricing: {
      essential: { name: string; price: string };
      professional: { name: string; price: string };
      business: { name: string; price: string };
      enterprise: { name: string; price: string; features: string[] };
    };
    finalCta: { subtitle: string };
  };
  auth: { password: string; successWorkspace: string; errorOnboarding: string };
};

const messages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/messages/de.json'), 'utf8'),
) as GermanMessages;
const serialized = JSON.stringify(messages);

describe('German product copy safety', () => {
  it('rejects unsupported compliance, certification, outcome, scope, and trial claims', () => {
    for (const prohibited of [
      '73 %',
      '40 Stunden',
      'DSGVO-konform',
      'Unveränderlicher Audit Trail',
      'ISO 27001 in Vorbereitung',
      'Unbegrenzte Länder',
      'DORA-, NIS2-',
      '14 Tage kostenlos',
      'Jetzt abonnieren',
    ]) {
      expect(serialized).not.toContain(prohibited);
    }
  });

  it('uses evidence-safe German positioning and canonical plan names', () => {
    expect(messages.landing.badge).toBe('Vorbereitung der KI-Governance für europäische Teams');
    expect(messages.landing.badges.gdpr).toBe('DSGVO-orientierte Abläufe');
    expect(messages.landing.badges.auditLogs).toBe('Prüfbarer Audit-Verlauf');
    expect(messages.landing.badges.soc).toBe('Planung der Sicherheitsreife');
    expect(messages.landing.pricing.essential.name).toBe('Starter');
    expect(messages.landing.pricing.professional.name).toBe('Growth');
    expect(messages.landing.pricing.business.name).toBe('Business');
    expect(messages.landing.pricing.enterprise.name).toBe('Enterprise');
    expect(messages.landing.pricing.enterprise.features).toContain('Vertragsspezifisches SLA');
    expect(messages.landing.pricing.enterprise.features).toContain('Module zur Vorbereitung auf den AI Act');
  });

  it('keeps the published price amounts while using German formatting', () => {
    expect(messages.landing.pricing.essential.price).toBe('49 €');
    expect(messages.landing.pricing.professional.price).toBe('149 €');
    expect(messages.landing.pricing.business.price).toBe('399 €');
    expect(messages.landing.pricing.enterprise.price).toBe('Ab 990 €');
  });

  it('uses professional German account and workspace terminology', () => {
    expect(messages.auth.password).toBe('Passwort');
    expect(messages.auth.successWorkspace).toContain('Arbeitsbereich');
    expect(messages.auth.errorOnboarding).toContain('Einrichtung');
  });
});
