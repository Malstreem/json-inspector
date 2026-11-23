import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Packaging Chrome Extension ---');

// 1. Ensure assets and icons exist
if (!fs.existsSync('public/icons/icon-128.png')) {
  console.log('Generating extension icons and promo assets...');
  execSync('node scripts/generate-assets.mjs', { stdio: 'inherit' });
}

// 2. Build production assets
console.log('Building project...');
execSync('npm run build', { stdio: 'inherit' });

// 3. Package zip with standard forward slashes and flat root
const distDir = path.resolve('dist');
const zipFile = path.resolve('json-inspector-extension.zip');

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

console.log(`Creating ${zipFile} from ${distDir}...`);
// Use tar to create zip from within dist directory for standard forward slashes
execSync(`tar -a -c -f "${zipFile}" *`, {
  cwd: distDir,
  stdio: 'inherit',
});

const stats = fs.statSync(zipFile);
console.log(`\nExtension packaged successfully!`);
console.log(`File: ${zipFile}`);
console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
