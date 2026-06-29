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

    const firstInteractive = page.locator('a[href], button, input, select, textarea').first();
    await expect(firstInteractive).toBeVisible();
    await firstInteractive.focus();

    const focusStyles = await firstInteractive.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });

    expect(
      focusStyles.outlineStyle !== 'none' ||
        focusStyles.outlineWidth !== '0px' ||
        focusStyles.boxShadow !== 'none'
    ).toBeTruthy();

    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.screenshot({ path: 'test-results/premium-home-desktop.png', fullPage: true });
  });
});
