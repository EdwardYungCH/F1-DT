import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const server = spawn(process.execPath, [fileURLToPath(new URL('server.mjs', import.meta.url))],
  { stdio: ['inherit', 'pipe', 'inherit'] });
let opened = false;
server.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  if (opened || !chunk.toString().includes('F1-DT preview: ')) return;
  opened = true;
  const url = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
  if (!url) return;
  const opener = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url],
    { detached: true, stdio: 'ignore', windowsHide: true });
  opener.on('error', () => console.log('Open the preview URL in your browser.'));
  opener.unref();
});
server.on('error', error => { console.error(error); process.exitCode = 1; });
server.on('exit', code => { process.exitCode = code || 0; });
