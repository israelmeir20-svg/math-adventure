/**
 * Screenshots the star stages so the result can be looked at.
 *
 * The bundled Playwright expects a Chromium build that is not installed, and the project does
 * not need another download for a one-off look - so this points at the Chromium already on the
 * machine. If that path ever moves, `npx playwright install chromium` is the fallback.
 *
 * Run: node tools/starShot.mjs
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

const CANDIDATES = [
  `${homedir()}/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe`,
  `${homedir()}/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe`,
  `${homedir()}/AppData/Local/ms-playwright/chromium-1161/chrome-win64/chrome.exe`,
];
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error('no local chromium found; run: npx playwright install chromium');
  process.exit(1);
}
console.log(`using ${executablePath}`);

const url = pathToFileURL(resolve('dist/star-shot.html')).href;
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 880, height: 1200 }, deviceScaleFactor: 2 });
await page.goto(url);
await page.waitForTimeout(600);

const figures = await page.locator('figure').all();
console.log(`figures: ${figures.length}`);
for (const [i, fig] of figures.entries()) {
  const out = `dist/star-shot-${i}.png`;
  await fig.screenshot({ path: out });
  console.log(`  wrote ${out}`);
}

await browser.close();
