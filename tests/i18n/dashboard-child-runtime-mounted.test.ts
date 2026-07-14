import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const layoutPath = resolve(process.cwd(), 'src/app/[locale]/dashboard/layout.tsx');
const source = readFileSync(layoutPath, 'utf8');
const runtimeMount = '<DashboardChildI18nRuntime />';

describe('dashboard child i18n runtime mounting', () => {
  it('imports and mounts the runtime once in the localized dashboard layout', () => {
    expect(source).toContain("import DashboardChildI18nRuntime from '@/components/DashboardChildI18nRuntime';");
    expect(source.split(runtimeMount)).toHaveLength(2);
  });

  it('mounts the runtime before dashboard children', () => {
    const runtimeIndex = source.indexOf(runtimeMount);
    const childrenIndex = source.indexOf('{children}');

    expect(runtimeIndex).toBeGreaterThan(-1);
    expect(childrenIndex).toBeGreaterThan(runtimeIndex);
  });
});
