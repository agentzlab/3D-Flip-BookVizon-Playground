// Run from repo: node scripts/measure-leaf.cjs [output.json]
// Requires Playwright; no npm dependencies or production files are modified.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const hook = `
window.__leafAudit = {
  async prepare(f) {
    if (typeof closeShelf === 'function') closeShelf();
    layoutMode = 'double'; turnMode = 'hardcover'; flipped = f; focus = 0; fit();
    await Promise.all(turnIndices('next').filter(i => i >= 0 && i < N).map(i => effImg(i).decode()));
    setupTurn('next', 'bottom');
    return { pageSize, pageH, winW, winH, canvasDpr,
      canvas: [canvas.width, canvas.height], material: leafMaterial,
      images: [leafFrontImg, leafBackImg].map(im => ({width: im.naturalWidth, height: im.naturalHeight, src: im.src.slice(0,100)})) };
  },
  measure(baked, readback, count) {
    const original = [leafFrontImg, leafBackImg];
    let bakeSubmitMs = 0, bakeReadbackMs = 0;
    if (baked) {
      const t0 = performance.now();
      const faces = original.map(im => {
        const c = document.createElement('canvas');
        c.width = Math.round(pageSize * canvasDpr); c.height = Math.round(pageH * canvasDpr);
        const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high';
        cx.drawImage(im, 0, 0, c.width, c.height);
        // Match the image interface consumed by the unmodified renderer.
        c.complete = true; c.naturalWidth = c.width; c.naturalHeight = c.height;
        return c;
      });
      bakeSubmitMs = performance.now() - t0;
      const t1 = performance.now();
      faces.forEach(c => c.getContext('2d').getImageData(0, 0, c.width, c.height));
      bakeReadbackMs = performance.now() - t1;
      [leafFrontImg, leafBackImg] = faces;
    }
    let calls = 0, fills = 0, clears = 0;
    const di = ctx2d.drawImage, fr = ctx2d.fillRect, cr = ctx2d.clearRect;
    ctx2d.drawImage = function(...a) { calls++; return di.apply(this,a); };
    ctx2d.fillRect = function(...a) { fills++; return fr.apply(this,a); };
    ctx2d.clearRect = function(...a) { clears++; return cr.apply(this,a); };
    function pose(i) {
      const deg = -180 * ((i % 120) + 0.5) / 120;
      const s = Math.sin(Math.PI * Math.abs(deg) / 180);
      drawLeaf2D(deg, 1, leafMaterial === 'board' ? 0 : s * .13, leafMaterial === 'board' ? 0 : s);
      if (readback) ctx2d.getImageData(0, 0, canvas.width, canvas.height);
    }
    try {
      for (let i=0; i<12; i++) pose(i);
      // Drain queued raster work before timing submission-only trials.
      ctx2d.getImageData(0,0,canvas.width,canvas.height);
      calls=0; fills=0; clears=0;
      const t = performance.now();
      for (let i=0; i<count; i++) pose(i);
      const elapsedMs = performance.now()-t;
      const td = performance.now();
      ctx2d.getImageData(0,0,canvas.width,canvas.height);
      return { baked, readback, count, elapsedMs, msPerPose: elapsedMs/count,
        drawsPerPose:calls/count, fillsPerPose:fills/count, clearsPerPose:clears/count,
        finalDrainMs:performance.now()-td, bakeSubmitMs, bakeReadbackMs };
    } finally {
      ctx2d.drawImage=di; ctx2d.fillRect=fr; ctx2d.clearRect=cr;
      [leafFrontImg, leafBackImg] = original;
    }
  }
};
`;
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if (pathname === '/' || pathname === '/index.html') {
    res.setHeader('Content-Type','text/html');
    res.end(source.replace('    var landingGuard =', hook + '\n    var landingGuard ='));
    return;
  }
  const file = path.resolve(root, '.'+pathname);
  if (!file.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
  if (!fs.existsSync(file)) {res.writeHead(404);res.end();return;}
  const ext=path.extname(file);
  res.setHeader('Content-Type', ({'.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.css':'text/css'})[ext] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  console.log('Launching Chromium');
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/usr/bin/chromium',args:['--disable-gpu','--disable-accelerated-2d-canvas']});
  try {
    const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2});
    await page.route('https://**/*', route=>route.abort());
    console.log('Opening viewer');
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
    await page.waitForFunction(()=>window.__leafAudit && document.body.dataset.flipReady==='1');
    const results={browser:browser.version(),flags:['--disable-gpu','--disable-accelerated-2d-canvas'],viewport:[844,390],dpr:2,trials:[]};
    for (const f of [0,3]) {
      console.log('Preparing leaf '+f);
      const geometry=await page.evaluate(f=>__leafAudit.prepare(f),f);
      for(let repeat=0;repeat<3;repeat++) {
        // Alternate order to avoid giving either source a consistent warmup advantage.
        for (const baked of (repeat%2 ? [true,false] : [false,true])) {
          for(const readback of [false,true]) {
            const trial=await page.evaluate(({baked,readback})=>__leafAudit.measure(baked,readback,120),{baked,readback});
            results.trials.push({flipped:f,repeat,geometry,...trial});
            console.log(JSON.stringify({flipped:f,repeat,baked,readback,msPerPose:trial.msPerPose}));
          }
        }
      }
    }
    fs.writeFileSync(process.argv[2]||'leaf-measurements.json',JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results.trials.map(t=>({f:t.flipped,baked:t.baked,readback:t.readback,ms:t.msPerPose})),null,2));
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
