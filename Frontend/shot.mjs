import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
  headless: 'new',
  args: [
    '--no-sandbox', '--disable-setuid-sandbox',
    '--use-gl=swiftshader', '--enable-webgl',
    '--ignore-gpu-blocklist', '--disable-dev-shm-usage',
    '--window-size=1440,900',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
// give three.js time to load GLB + render a few frames
await new Promise(r => setTimeout(r, 6000));

await page.screenshot({ path: '/tmp/home.png' });
console.log('SCREENSHOT SAVED');
console.log('ERRORS:', errors.length ? errors.slice(0,10).join('\n') : 'none');
await browser.close();
