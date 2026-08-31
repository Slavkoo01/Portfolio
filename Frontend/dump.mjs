import puppeteer from 'puppeteer-core';
import fs from 'fs';
const browser = await puppeteer.launch({
  executablePath: '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
  headless: 'new',
  args: ['--no-sandbox','--disable-setuid-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 8000));
const dump = await page.evaluate(() => window.__meshDump || []);
fs.writeFileSync('/tmp/meshdump.json', JSON.stringify(dump));
console.log('meshes captured:', dump.length);
await browser.close();
