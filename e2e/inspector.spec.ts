import { expect, test } from '@playwright/test';

test('loads the sample document and renders its graph', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('JSON Inspector');
  await expect(page.getByRole('region', { name: 'JSON Editor' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'JSON Graph' })).toBeVisible();
  await expect(page.locator('#status-nodes')).not.toHaveText('Nodes: 0');
  expect(await page.locator('#graph-group [data-node-index]').count()).toBeGreaterThan(0);
});

test('reports invalid JSON, recovers, and toggles a graph branch', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('.cm-content');

  await editor.fill('{"invalid":}');
  await expect(page.locator('#status-error')).not.toBeEmpty();
  await expect(page.locator('#status-nodes')).toHaveText('Nodes: 0');

  await editor.fill('{"branch":{"leaf":1}}');
  await expect(page.locator('#status-error')).toBeEmpty();
  await expect(page.locator('#status-nodes')).toHaveText('Nodes: 2');

  const branch = page.locator('#graph-group [data-row-index="0"][role="button"]');
  await expect(branch).toHaveAttribute('aria-expanded', 'true');
  await branch.click();
  await expect(page.locator('#graph-group [data-row-index="0"][role="button"]'))
    .toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#graph-group')).not.toContainText('leaf:');
});

test('searches graph rows and exports the graph', async ({ page }) => {
  await page.goto('/');
  await page.locator('#search-input').fill('Electronics');
  await expect(page.locator('#graph-group rect[fill="#ffd700"]')).toHaveCount(1);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export graph as SVG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.svg$/);
});

test('formats JSON and copies the selected graph node', async ({ page }) => {
  await page.goto('/');
  await page.context().grantPermissions(
    ['clipboard-read', 'clipboard-write'],
    { origin: 'http://127.0.0.1:3000' }
  );
  const editor = page.locator('.cm-content');
  await editor.fill('{"copyMe":{"value":7}}');
  await page.locator('#btn-format').click();
  await expect(editor).toContainText('"copyMe": {');
  await expect(page.locator('#status-nodes')).toHaveText('Nodes: 2');

  await page.locator('#graph-group [data-node-index="0"]').click();
  await page.keyboard.press('Control+C');
  await expect(page.locator('#status-copy')).toHaveText('Copied value.');
  await expect.poll(async () => (
    await page.evaluate(() => navigator.clipboard.readText())
  ).replace(/\r\n/g, '\n'))
    .toBe('{\n  "copyMe": {\n    "value": 7\n  }\n}');
});
