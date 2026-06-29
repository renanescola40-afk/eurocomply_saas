import { expect, test } from '@playwright/test';

test.describe('premium design system', () => {
  test('keeps the public experience dark, accessible and responsive', async ({ page }) => {
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

    expect(tokens.background, 'dark foundation token should be present').toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens.foreground, 'foreground token should be present').toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens.ring, 'focus ring token should be present').toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens.surface, 'elevated surface token should be present').toMatch(/rgba|#/i);

    const firstInteractive = page.locator('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])').first();
    await expect(firstInteractive).toBeVisible();
    await firstInteractive.focus();

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
