import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const catalog = JSON.parse(readFileSync('src/messages/es.json', 'utf8')) as Record<string, unknown>;
const source = JSON.stringify(catalog);

describe('Spanish (Spain) copy quality', () => {
  it('keeps native Spanish diacritics and punctuation', () => {
    for (const term of ['Preparación', 'más', 'revisión', 'auditoría', 'Múltiples', 'país', 'Contraseña', '¿Aún', 'Cuéntanos', 'Tamaño']) {
      expect(source).toContain(term);
    }
  });

  it('does not regress to common ASCII transliterations', () => {
    for (const term of ['Preparacion', 'mas estructura', 'revision empresarial', 'auditoria revisable', 'Multiples NIF', 'Tamano de empresa', 'Aun no tienes']) {
      expect(source).not.toContain(term);
    }
  });

  it('uses approved Spanish product terminology', () => {
    expect(catalog).toMatchObject({
      auth: {
        email: 'Correo electrónico',
        password: 'Contraseña',
        successWorkspace: 'Espacio de trabajo creado correctamente.',
      },
      onboarding: {
        industry: { retail: 'Comercio minorista' },
      },
    });
  });
});
