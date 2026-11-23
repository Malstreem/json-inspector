import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ICONS_DIR = path.resolve('public/icons');
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Sleek modern SVG icon with dark gradient background, glowing squircle, and styled braces with graph node dots
function getIconSvg(size) {
  const rx = Math.round(size * 0.22);
  const strokeW = Math.max(1, Math.round(size * 0.025));
  const fontSize = Math.round(size * 0.52);
  const dotR = Math.max(1.5, Math.round(size * 0.05));
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1832" />
      <stop offset="50%" stop-color="#141122" />
      <stop offset="100%" stop-color="#0c0a14" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#6366f1" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.3" />
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0e7ff" />
      <stop offset="50%" stop-color="#c4b5fd" />
      <stop offset="100%" stop-color="#a78bfa" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${Math.max(1, size * 0.04)}" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background card -->
  <rect x="${strokeW}" y="${strokeW}" width="${size - strokeW * 2}" height="${size - strokeW * 2}" rx="${rx}" fill="url(#bgGrad)" stroke="url(#glowGrad)" stroke-width="${strokeW}" />

  <!-- Graph node connections (subtle) -->
  <line x1="${size * 0.22}" y1="${size * 0.25}" x2="${size * 0.78}" y2="${size * 0.25}" stroke="#818cf8" stroke-width="${Math.max(1, size * 0.02)}" stroke-opacity="0.25" stroke-dasharray="${size * 0.04} ${size * 0.04}" />
  <circle cx="${size * 0.22}" cy="${size * 0.25}" r="${dotR}" fill="#818cf8" opacity="0.6" />
  <circle cx="${size * 0.78}" cy="${size * 0.25}" r="${dotR}" fill="#38bdf8" opacity="0.6" />
  <circle cx="${size * 0.5}" cy="${size * 0.8}" r="${dotR}" fill="#a78bfa" opacity="0.6" />

  <!-- Main { } symbol -->
  <text x="${size / 2}" y="${size / 2 + fontSize * 0.35}"
    font-family="system-ui, -apple-system, 'Segoe UI', Roboto, 'JetBrains Mono', Consolas, monospace"
    font-size="${fontSize}"
    font-weight="800"
    fill="url(#textGrad)"
    text-anchor="middle"
    letter-spacing="-${size * 0.02}px"
    filter="url(#glow)">{ }</text>
</svg>`;
}

async function run() {
  console.log('Launching browser to render assets...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1. Generate Extension Icons: 16, 32, 48, 128
  for (const size of [16, 32, 48, 128]) {
    const svg = getIconSvg(size);
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;">${svg}</body></html>`);
    const buffer = await page.screenshot({ omitBackground: true });
    const outPath = path.resolve(ICONS_DIR, `icon-${size}.png`);
    fs.writeFileSync(outPath, buffer);
    console.log(`Generated ${outPath} (${size}x${size})`);
  }

  // Also write favicon.svg replacement with high quality SVG
  fs.writeFileSync(path.resolve('public/favicon.svg'), getIconSvg(32));
  console.log('Updated public/favicon.svg');

  // 2. Generate Store Promo Tile: 440x280
  {
    const w = 440, h = 280;
    await page.setViewportSize({ width: w, height: h });
    const promoHtml = `<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${w}px; height: ${h}px;
    background: radial-gradient(circle at 70% 30%, #1e1b4b 0%, #0f0d1b 60%, #08070d 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #f1f5f9;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(139, 92, 246, 0.25) 1px, transparent 1px);
    background-size: 20px 20px;
    opacity: 0.6;
  }
  .icon-box {
    margin-bottom: 14px;
    filter: drop-shadow(0 8px 24px rgba(139, 92, 246, 0.5));
  }
  h1 {
    font-size: 26px;
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 30%, #c4b5fd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }
  p {
    font-size: 13px;
    color: #94a3b8;
    max-width: 320px;
    line-height: 1.4;
    margin-bottom: 12px;
  }
  .badges {
    display: flex;
    gap: 8px;
  }
  .badge {
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.4);
    color: #c4b5fd;
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 999px;
  }
</style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="icon-box">${getIconSvg(64)}</div>
  <h1>JSON Inspector</h1>
  <p>Visual Graph & Tree Canvas Explorer for Deeply Nested JSON</p>
  <div class="badges">
    <span class="badge">WebAssembly Fast</span>
    <span class="badge">Side Panel</span>
    <span class="badge">100% Local</span>
  </div>
</body>
</html>`;
    await page.setContent(promoHtml);
    const promoBuffer = await page.screenshot();
    const promoPath = path.resolve('public/promo-tile-440x280.png');
    fs.writeFileSync(promoPath, promoBuffer);
    console.log(`Generated ${promoPath} (440x280)`);
  }

  await browser.close();
  console.log('Asset generation complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
