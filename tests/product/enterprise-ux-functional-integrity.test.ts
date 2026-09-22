import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') ? [absolute] : [];
  });
}

describe('enterprise UX functional integrity', () => {
  it('keeps the templates workspace inside the canonical dashboard main landmark', () => {
    const source = fs.readFileSync(
      path.join(root, 'src/app/[locale]/dashboard/organizations/templates/page.tsx'),
      'utf8',
    );
    expect(source).not.toContain('<main');
    expect(source).toContain('createTaskFromTemplate');
    expect(source).toContain('createDocumentFromTemplate');
  });

  it('labels the public dashboard illustration as non-interactive sample content', () => {
    const source = fs.readFileSync(
      path.join(root, 'src/components/marketing/enterprise-landing-v2.tsx'),
      'utf8',
    );
    expect(source).toContain('data-illustrative-preview="true"');
    expect(source).toContain('Illustrative non-interactive product preview');
    expect(source).toContain('Illustrative sample');
    expect(source).not.toContain("isPt ? 'Ver todas' : 'View all'");
  });

  it('contains no obvious dead-link patterns in buyer-facing source', () => {
    const roots = [
      'src/app/[locale]',
      'src/components/dashboard',
      'src/components/marketing',
      'src/components/team',
      'src/components/documents',
      'src/components/reports',
      'src/components/platform',
      'src/components/profile',
      'src/components/ai-governance',
      'src/components/compliance',
      'src/components/vendors',
      'src/components/auth',
    ];
    const offenders: string[] = [];

    for (const relativeRoot of roots) {
      for (const file of walk(path.join(root, relativeRoot))) {
        const source = fs.readFileSync(file, 'utf8');
        if (/href\s*=\s*["']\s*["']/.test(source) || /href\s*=\s*["']#["']/.test(source) || /javascript\s*:\s*void/i.test(source)) {
          offenders.push(path.relative(root, file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('contains no obvious inert native type=button controls in product source', () => {
    const roots = [
      'src/app/[locale]',
      'src/components/dashboard',
      'src/components/marketing',
      'src/components/team',
      'src/components/documents',
      'src/components/reports',
      'src/components/platform',
      'src/components/profile',
      'src/components/ai-governance',
      'src/components/compliance',
      'src/components/vendors',
      'src/components/auth',
    ];
    const offenders: Array<{ file: string; tag: string }> = [];

    for (const relativeRoot of roots) {
      for (const file of walk(path.join(root, relativeRoot))) {
        const source = fs.readFileSync(file, 'utf8');
        for (const match of source.matchAll(/<button\b[\s\S]*?>/g)) {
          const tag = match[0];
          if (!/type\s*=\s*["']button["']/.test(tag)) continue;
          if (/onClick\s*=/.test(tag)) continue;
          if (/disabled(?:\s|=|>)/.test(tag)) continue;
          if (/form\s*=/.test(tag)) continue;
          if (/\{\.\.\./.test(tag)) continue;
          offenders.push({ file: path.relative(root, file), tag: tag.replace(/\s+/g, ' ').slice(0, 220) });
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
