// tiny CDP driver: node tools/cdp.js <url> <out.png> [waitMs]  -> prints console errors, saves screenshot
const {spawn} = require('child_process'); const fs = require('fs'); const os = require('os'); const path = require('path');
const [url, out, wait = 2500] = process.argv.slice(2);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp'));
const port = 9300 + Math.floor(Math.random() * 500);
const ch = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=' + port, '--user-data-dir=' + dir, '--window-size=375,667', 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch (e) { await sleep(200); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); let id = 0; const pend = {};
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) pend[m.id](m.result || m); 
    if (m.method === 'Runtime.exceptionThrown') console.log('EXC', JSON.stringify(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).slice(0, 600));
    if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) console.log('CONSOLE', m.params.args.map(a => a.value || a.description).join(' ').slice(0, 400)); };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 375, height: 667, deviceScaleFactor: 2, mobile: true});
  await send('Page.navigate', {url}); await sleep(+wait);
  if (process.env.EVAL) { const r = await send('Runtime.evaluate', {expression: process.env.EVAL, awaitPromise: true, returnByValue: true}); console.log('EVAL', JSON.stringify(r.result && r.result.value !== undefined ? r.result.value : r).slice(0, 1500)); await sleep(800); }
  const shot = await send('Page.captureScreenshot', {format: 'png'}); if (out) fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  ws.close(); ch.kill(); process.exit(0);
})();
