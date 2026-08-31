import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome',
  headless: 'new',
  args: ['--no-sandbox','--disable-setuid-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage','--window-size=1440,900'],
});
const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:4173/?v=' + Date.now(), { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/home.png' });
console.log('SHOT2 SAVED');
await browser.close();
