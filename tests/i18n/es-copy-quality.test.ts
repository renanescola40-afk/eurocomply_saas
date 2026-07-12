import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const messages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/messages/es.json'), 'utf8'),
) as Record<string, unknown>;

const serialized = JSON.stringify(messages);

const forbiddenAsciiRegressions = [
  'Preparacion', 'mas estructura', 'revision empresarial',
  'demostracion', 'Operacion europea', 'auditoria',
  'Planificacion', 'calculo', 'multilingues', 'evalua',
  'Manten', 'Multiples', 'pais', 'documentacion',
  'friccion', 'paises', 'basico', 'aprobacion',
  'categoria', 'especifico', 'Modulos', 'Metricas',
  'Aun no tienes', 'Tamano', 'Mas de 1000', 'Tecnologia',
];

describe('Spanish message quality', () => {
  it('uses native Spanish diacritics instead of ASCII transliterations', () => {
    for (const value of forbiddenAsciiRegressions) {
      expect(serialized).not.toContain(value);
    }
  });

  it('retains conservative readiness and evidence vocabulary', () => {
    expect(serialized).toContain('preparación de evidencias');
    expect(serialized).toContain('Apoyo para la preparación ante el AI Act');
    expect(serialized).toContain('Registro de auditoría');
  });
});
