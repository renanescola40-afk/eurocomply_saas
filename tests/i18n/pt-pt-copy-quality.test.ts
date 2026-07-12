import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const messages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/messages/pt.json'), 'utf8'),
) as Record<string, unknown>;

const serialized = JSON.stringify(messages);

const forbiddenAsciiRegressions = [
  'Seguranca', 'evidencias', 'governanca', 'demonstracao',
  'Operacao europeia', 'Calendario', 'Noticias', 'funcionarios',
  'Multiplos', 'Construido', 'documentacao', 'friccao',
  'paises', 'Ate ', 'Relatorios', 'Metricas',
  'Nao foi possivel', 'Ja tem conta', 'Dimensao',
  'Financas', 'Saude', 'Industria',
];

describe('Portuguese (Portugal) message quality', () => {
  it('uses native Portuguese diacritics instead of ASCII transliterations', () => {
    for (const value of forbiddenAsciiRegressions) {
      expect(serialized).not.toContain(value);
    }
  });

  it('retains the approved readiness and evidence vocabulary', () => {
    expect(serialized).toContain('preparação de evidências');
    expect(serialized).toContain('Apoio à preparação para o AI Act');
    expect(serialized).toContain('Registo de auditoria');
  });
});
