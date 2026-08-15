import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/components/dashboard/dashboard-command-navigation.tsx', 'utf8');

describe('dashboard command navigation accessibility', () => {
  it('keeps mobile disclosure toggles separate from navigation links', () => {
    const mobile = source.slice(source.indexOf('function MobileNavigation'), source.indexOf('export function DashboardCommandNavigation'));
    const groupedDisclosure = mobile.slice(
      mobile.indexOf('<details key={item.label}'),
      mobile.indexOf('<div className="mt-1 space-y-1 border-t pt-2">'),
    );

    expect(mobile).toContain('if (!item.sections?.length)');
    expect(groupedDisclosure).toContain('<summary');
    expect(groupedDisclosure).toContain('<span>{item.label}</span>');
    expect(groupedDisclosure).not.toContain('<Link');
    expect(mobile).toContain('min-h-11');
  });

  it('provides visible keyboard focus treatment for the mobile menu and links', () => {
    expect(source).toContain('focus-visible:ring-2');
    expect(source).toContain('focus-visible:ring-offset-2');
    expect(source).toContain('aria-label={copy.openMenu}');
    expect(source).toContain('aria-label={copy.mobileNavigation}');
  });

  it('marks decorative navigation icons hidden from assistive technology', () => {
    expect(source).toContain('<Menu className="h-5 w-5 group-open:hidden" aria-hidden="true" />');
    expect(source).toContain('<X className="hidden h-5 w-5 group-open:block" aria-hidden="true" />');
    expect(source).toContain('<Bell className="h-4 w-4" aria-hidden="true" />');
  });
});
