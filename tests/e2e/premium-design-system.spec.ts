import { expect, test } from '@playwright/test';

function parseColorChannel(value: string) {
  const color = value.trim().toLowerCase();

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const normalized = hex.length === 3 ? hex.split('').map((part) => `${part}${part}`).join('') : hex;
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }

  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;

  const channels = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  if (channels.length < 3 || channels.some((channel) => Number.isNaN(channel))) return null;

  return { r: channels[0], g: channels[1], b: channels[2] };
}

function relativeLuminance(value: string) {
  const rgb = parseColorChannel(value);
  if (!rgb) return null;

  const normalize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b);
}

test.describe('premium design system', () => {
  test('keeps the public experience dark, accessible and responsive', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('risckcomply.analytics.consent', 'denied');
    });
    const response = await page.goto('/pt', { waitUntil: 'domcontentloaded' });

    expect(response?.status(), 'public landing should not 404').not.toBe(404);
    expect(response?.status(), 'public landing should not server-error').toBeLessThan(500);

    const tokens = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.documentElement);
      return {
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim(),
        ring: styles.getPropertyValue('--ring').trim(),
        surface: styles.getPropertyValue('--surface-elevated').trim(),
      };
    });

    const backgroundLuminance = relativeLuminance(tokens.background);
    const foregroundLuminance = relativeLuminance(tokens.foreground);
    const ringLuminance = relativeLuminance(tokens.ring);
    const surfaceLuminance = relativeLuminance(tokens.surface);

    expect(backgroundLuminance, 'dark foundation token should parse').not.toBeNull();
    expect(foregroundLuminance, 'foreground token should parse').not.toBeNull();
    expect(ringLuminance, 'focus ring token should parse').not.toBeNull();
    expect(surfaceLuminance, 'elevated surface token should parse').not.toBeNull();

    expect(backgroundLuminance!, 'background must stay dark').toBeLessThan(0.08);
    expect(surfaceLuminance!, 'elevated surface must stay dark').toBeLessThan(0.16);
    expect(foregroundLuminance!, 'foreground must stay light').toBeGreaterThan(0.8);
    expect(ringLuminance!, 'focus ring must remain visible on dark UI').toBeGreaterThan(backgroundLuminance! + 0.12);

    const firstInteractive = page.locator(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
    ).first();
    await expect(firstInteractive).toBeVisible();
    await firstInteractive.focus();
    await expect(firstInteractive).toBeFocused();

    await page.keyboard.press('Tab');
    const focusedInteractive = page.locator(':focus');
    await expect(focusedInteractive).toBeVisible();
    await expect(firstInteractive).not.toBeFocused();
    const focusedElementIsInteractive = await focusedInteractive.evaluate((element) => element.matches(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    expect(focusedElementIsInteractive, 'Tab should focus an enabled interactive control').toBe(true);

    const focusOutline = await page.evaluate(() => {
      const activeElement = document.activeElement;
      if (!activeElement) return { style: '', width: '' };
      const styles = window.getComputedStyle(activeElement);
      return { style: styles.outlineStyle, width: styles.outlineWidth };
    });

    expect(focusOutline.style, 'focused control should expose a visible outline style').not.toBe('none');
    expect(focusOutline.width, 'focused control should expose a visible outline width').not.toBe('0px');

    await page.setViewportSize({ width: 390, height: 844 });
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasOverflow, 'mobile landing should not horizontally overflow').toBe(false);
  });
});
