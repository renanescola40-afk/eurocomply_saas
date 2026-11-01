import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sanitizeHTML } from '../../src/lib/security/xss';

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies: Record<string, string>;
};

const lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages: Record<string, { version?: string }>;
};

describe('DOMPurify security patch', () => {
  it('pins the reviewed patched DOMPurify release in both manifest and lockfile', () => {
    expect(manifest.dependencies.dompurify).toBe('3.4.17');
    expect(lockfile.packages['node_modules/dompurify']?.version).toBe('3.4.17');
  });

  it('keeps allowed rich text while removing script elements and event handlers', () => {
    const sanitized = sanitizeHTML(
      '<p>Safe <strong>formatted text</strong></p><script>alert(1)</script><img src=x onerror="alert(2)">',
    );

    expect(sanitized).toContain('<p>Safe <strong>formatted text</strong></p>');
    expect(sanitized).not.toMatch(/<script\b/i);
    expect(sanitized).not.toMatch(/<img\b/i);
    expect(sanitized).not.toMatch(/onerror\s*=/i);
  });

  it('removes javascript URLs and inline event attributes from links', () => {
    const sanitized = sanitizeHTML(
      '<a href="javascript:alert(1)" onclick="alert(2)">Open link</a>',
    );

    expect(sanitized).toContain('Open link');
    expect(sanitized).not.toMatch(/javascript\s*:/i);
    expect(sanitized).not.toMatch(/onclick\s*=/i);
  });
});
