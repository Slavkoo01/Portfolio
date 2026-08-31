import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
  headless: 'new',
  args: ['--no-sandbox','--disable-setuid-sandbox','--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-dev-shm-usage'],
});
const page = await browser.newPage();
const all = [];
page.on('console', m => all.push(m.text()));
page.on('pageerror', e => all.push('PAGEERR: '+e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 8000));
import('fs').then(fs => fs.writeFileSync('/tmp/logs.txt', all.join('\n')));
console.log('total logs:', all.length);
await browser.close();
