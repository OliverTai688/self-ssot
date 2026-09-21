const fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/pzps0964713/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = path.join(process.cwd(), 'docs/2_agent-input/generated/yuanzhan-v5-fidelity');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage(), results = [];
    const files = fs.readdirSync(path.join(out, 'reference')).filter(file => /^[a-z]+-\d\.png$/.test(file));
    files.push('issue-drawer.png');
    for (const file of files) {
      const actual = path.join(out, 'showcase-' + file);
      if (!fs.existsSync(actual)) throw Error('Missing ' + actual);
      const [reference, implementation] = [path.join(out, 'reference', file), actual].map(file => 'data:image/png;base64,' + fs.readFileSync(file).toString('base64'));
      const region = file === 'issue-drawer.png' ? { x: 980, y: 0, width: 460, height: 1000 } : { x: 78, y: 139, width: 1362, height: 861 };
      const result = await page.evaluate(async ({ reference, implementation, region }) => {
        const read = async src => {
          const image = new Image(); image.src = src; await image.decode();
          if (image.width !== 1440 || image.height !== 1000) throw Error('Expected 1440x1000 screenshot');
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
          return ctx.getImageData(0, 0, image.width, image.height).data;
        };
        const a = await read(reference), b = await read(implementation);
        let n = 0, changed = 0, total = 0;
        for (let row = region.y; row < region.y + region.height; row++) for (let col = region.x; col < region.x + region.width; col++) {
          const i = (row * 1440 + col) * 4;
          const delta = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
          if (delta > 30) changed++; total += delta; n++;
        }
        return { within30RGBPercent: Math.round((1 - changed / n) * 10000) / 100, meanMaxChannelDelta: Math.round(total / n * 100) / 100 };
      }, { reference, implementation, region });
      results.push({ page: file, region, ...result });
    }
    fs.writeFileSync(path.join(out, 'visual-comparison.json'), JSON.stringify({ viewport: '1440x1000', scope: '30 workspace bodies excluding header and added rail controls; one complete issue drawer', method: 'Pixels with max RGB channel delta <=30; descriptive comparison, not a sole acceptance threshold', results }, null, 2));
    console.log(results);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
