const { test, expect } = require('@playwright/test');

test('login flow', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER_CONSOLE ' + msg.type() + ': ' + msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR: ' + err.toString()));
  page.on('requestfailed', req => console.log('REQUESTFAILED: ' + req.url() + ' - ' + req.failure()?.errorText));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('button', { name: /Kondwani/i }).first().click();
  await page.waitForTimeout(1500);
  console.log('TITLE=' + await page.title());
  console.log('BODY=' + (await page.locator('body').innerText()).slice(0,2000));
  await expect(page.getByText(/Welcome, Kondwani/i)).toBeVisible();
});
