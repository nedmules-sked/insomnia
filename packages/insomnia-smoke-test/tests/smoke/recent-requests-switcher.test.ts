import { expect } from '@playwright/test';

import { test } from '../../playwright/test';

const isMac = process.platform === 'darwin';
const nextTabKey = isMac ? 'ArrowRight' : 'Tab';
const prevTabKey = isMac ? 'ArrowLeft' : 'Tab';

test.describe('Ctrl+Tab MRU switcher', () => {
  test.slow(process.platform === 'darwin' || process.platform === 'win32', 'Slow app start');

  test('cycles through recent requests in MRU order', async ({ page }) => {
    await page.getByRole('button', { name: 'Create request collection', exact: true }).click();
    await page.getByLabel('Create in collection').click();
    await page.getByLabel('HTTP Request').click();
    await page.getByTestId('New Request').dblclick();
    await page.getByRole('textbox', { name: 'GET New Request' }).fill('alpha');
    await page.locator('body').click();

    await page.getByLabel('Create in collection').click();
    await page.getByLabel('HTTP Request').click();
    await page.getByTestId('New Request').dblclick();
    await page.getByRole('textbox', { name: 'GET New Request' }).fill('beta');
    await page.locator('body').click();

    await page.getByLabel('Create in collection').click();
    await page.getByLabel('HTTP Request').click();
    await page.getByTestId('New Request').dblclick();
    await page.getByRole('textbox', { name: 'GET New Request' }).fill('gamma');
    await page.locator('body').click();

    await page.getByTestId('alpha').click();
    await page.getByTestId('beta').click();
    await page.getByTestId('gamma').click();

    const holdModifiers = isMac
      ? async () => {
          await page.keyboard.down('Alt');
          await page.keyboard.down('Meta');
        }
      : async () => {
          await page.keyboard.down('Control');
        };
    const releaseModifiers = isMac
      ? async () => {
          await page.keyboard.up('Meta');
          await page.keyboard.up('Alt');
        }
      : async () => {
          await page.keyboard.up('Control');
        };
    const pressPrev = isMac
      ? async () => {
          await page.keyboard.press(prevTabKey);
        }
      : async () => {
          await page.keyboard.down('Shift');
          await page.keyboard.press(prevTabKey);
          await page.keyboard.up('Shift');
        };

    const dialog = page.getByRole('dialog', { name: 'Recent Requests' });

    await holdModifiers();
    await page.keyboard.press(nextTabKey);
    await expect.soft(dialog).toBeVisible();
    await expect.soft(dialog.locator('li[aria-selected="true"]')).toContainText('beta');
    await releaseModifiers();
    await expect.soft(dialog).toBeHidden();
    await expect
      .soft(page.getByLabel('Insomnia Tabs').getByLabel('tab-beta', { exact: true }))
      .toHaveAttribute('data-selected', 'true');

    await holdModifiers();
    await page.keyboard.press(nextTabKey);
    await expect.soft(dialog.locator('li[aria-selected="true"]')).toContainText('gamma');
    await page.keyboard.press(nextTabKey);
    await expect.soft(dialog.locator('li[aria-selected="true"]')).toContainText('alpha');
    await pressPrev();
    await expect.soft(dialog.locator('li[aria-selected="true"]')).toContainText('gamma');
    await page.keyboard.press('Escape');
    await releaseModifiers();
    await expect.soft(dialog).toBeHidden();
    await expect
      .soft(page.getByLabel('Insomnia Tabs').getByLabel('tab-beta', { exact: true }))
      .toHaveAttribute('data-selected', 'true');
  });
});
