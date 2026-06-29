import { expect, test } from '@playwright/test';

test.describe('premium design system', () => {
  test('keeps the public experience dark, accessible and screenshot-ready', async ({ page }) => {
    await page.goto('/pt');

    const tokens = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.documentElement);
      return {
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim(),
        ring: styles.getPropertyValue('--ring').trim(),
        surface: styles.getPropertyValue('--surface-elevated').trim(),
      };
    });

    expect(tokens.background).toBe('#040609');
    expect(tokens.foreground).toBe('#f7fbff');
    expect(tokens.ring).toBe('#75adff');
    expect(tokens.surface).toContain('rgba');

    await page.keyboard.press('Tab');
    const focusOutline = await page.evaluate(() => {
      const activeElement = document.activeElement;
      if (!activeElement) return '';
      return window.getComputedStyle(activeElement).outlineStyle;
    });

    expect(focusOutline).not.toBe('none');

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.screenshot({ path: 'test-results/premium-home-desktop.png', fullPage: true });
  });
});
