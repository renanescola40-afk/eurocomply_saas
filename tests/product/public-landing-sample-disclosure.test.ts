import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const ENTERPRISE_HOME = new URL(
  '../../src/components/marketing/enterprise-home.tsx',
  import.meta.url,
);

describe('public landing sample data disclosure', () => {
  it('labels public product previews as illustrative rather than production evidence', async () => {
    const source = await readFile(ENTERPRISE_HOME, 'utf8');

    expect(source).toContain('Illustrative previews');
    expect(source).toContain('not customer metrics or RISCK COMPLY production metrics');
    expect(source).toContain('Pré-visualizações ilustrativas');
    expect(source).toContain('não métricas de clientes nem métricas de produção da RISCK COMPLY');
    expect(source).toContain('data-public-sample-preview="true"');
    expect(source).toContain('role="note"');
  });
});
