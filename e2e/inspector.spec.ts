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

test('virtualizes graph nodes to the viewport and updates them while panning', async ({ page }) => {
  await page.goto('/');
  const records = Array.from({ length: 150 }, (_, index) => ({
    id: index,
    details: { value: `record-${index}` },
  }));
  await page.locator('.cm-content').fill(JSON.stringify({ records }));
  await expect(page.locator('#status-nodes')).toHaveText('Nodes: 301');
  await page.getByRole('button', { name: 'Expand all nodes' }).click();
  for (let index = 0; index < 8; index++) {
    await page.getByRole('button', { name: 'Zoom in' }).click();
  }

  const visibleNodeIndexes = async () => page.locator('#graph-group [data-node-index]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-node-index')));
  const initialNodeIndexes = await visibleNodeIndexes();
  expect(initialNodeIndexes.length).toBeLessThan(301);

  const graphBounds = await page.locator('#graph-svg').boundingBox();
  if (!graphBounds) throw new Error('Graph viewport is not available.');
  const startX = graphBounds.x + graphBounds.width - 10;
  const startY = graphBounds.y + graphBounds.height - 10;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 400, startY - 300, { steps: 5 });
  await page.mouse.up();

  await expect.poll(visibleNodeIndexes).not.toEqual(initialNodeIndexes);
  const pannedNodeIndexes = await visibleNodeIndexes();
  await page.setViewportSize({ width: 900, height: 650 });
  await expect.poll(visibleNodeIndexes).not.toEqual(pannedNodeIndexes);
});

test('opens the complete graph for arrays larger than the initial limit', async ({ page }) => {
  await page.goto('/');
  const records = Array.from({ length: 150 }, (_, index) => ({
    id: index,
    details: { value: `record-${index}` },
  }));
  await page.locator('.cm-content').fill(JSON.stringify({ records }));

  await expect(page.locator('#status-nodes')).toHaveText('Nodes: 301');
  await expect(page.locator('#graph-group [data-node-index]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Expand all nodes' }).click();

  await expect(page.locator('#graph-group [data-node-index]')).toHaveCount(301);

  await page.locator('.cm-content').fill(JSON.stringify(records));
  await expect(page.locator('#status-nodes')).toHaveText('Nodes: 301');
  await expect(page.locator('#graph-group [data-node-index]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Expand all nodes' }).click();
  await expect(page.locator('#graph-group [data-node-index]')).toHaveCount(301);
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
