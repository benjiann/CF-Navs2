# Chrome MCP Debugging Runbook

This note documents the working path for controlling Chrome through `chrome-devtools-mcp` from Codex on this Windows workspace. It is intended for future frontend debugging tasks where Codex needs to open Chrome, inspect pages, read console/network state, and verify UI behavior.

## What Worked

Use `chrome-devtools-mcp --autoConnect` and speak MCP over stdio with JSON lines. In this environment, that successfully connected to the existing Chrome instance and reused its network/profile configuration.

Do not assume `127.0.0.1:3805` is a Chrome DevTools endpoint. It responded to HTTP, but `/json/version` returned 404, so `chrome-devtools-mcp --browserUrl http://127.0.0.1:3805` failed.

## Quick Checks

Verify whether a port is a real Chrome DevTools Protocol endpoint:

```powershell
curl.exe -i --max-time 5 http://127.0.0.1:9222/json/version
curl.exe -i --max-time 5 http://127.0.0.1:3805/json/version
```

A usable DevTools endpoint returns JSON containing `webSocketDebuggerUrl`. A 404 means it is not valid for `--browserUrl`.

Verify the MCP package is cached/available:

```powershell
& 'D:\MySoft\nodejs\npx.cmd' -y chrome-devtools-mcp@latest --version
```

If sandboxing blocks npm cache writes, rerun with elevated permissions.

## Important Findings

- `chrome-devtools-mcp` stdio uses newline-delimited JSON messages, not `Content-Length` framed MCP messages.
- Spawning `npx.cmd` from Node can hang or fail to forward stdio correctly. Use `npx` once to cache the package, then run the cached package entry file directly with `node`.
- `--autoConnect` worked for the existing Chrome profile. This also avoided network/proxy issues seen with an isolated headless Chrome.
- `--browserUrl` only works with a standard Chrome DevTools HTTP endpoint such as `http://127.0.0.1:9222`, where `/json/version` works.
- Use the full tool set for frontend debugging. `--slim` exposes only `navigate`, `evaluate`, and `screenshot`; full mode exposes `navigate_page`, `take_snapshot`, `evaluate_script`, `list_console_messages`, `list_network_requests`, and form/input tools.

## Reusable Node Client

Run this from PowerShell when Codex needs direct MCP control and no native MCP tool is exposed in the session.

```powershell
@'
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function findMcpEntry() {
  const roots = [
    path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx'),
    path.join(process.env.APPDATA || '', 'npm', 'node_modules'),
  ].filter(Boolean);

  const stack = [...roots.filter(fs.existsSync)];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }

    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'chrome-devtools-mcp') {
          return path.join(dir, 'build', 'src', 'bin', 'chrome-devtools-mcp.js');
        }
      } catch {}
    }

    for (const e of entries) {
      if (e.isDirectory()) stack.push(path.join(dir, e.name));
    }
  }

  throw new Error('chrome-devtools-mcp is not cached. Run: npx -y chrome-devtools-mcp@latest --version');
}

const entry = findMcpEntry();
const cp = spawn(process.execPath, [
  entry,
  '--autoConnect',
  '--no-usage-statistics',
  '--no-performance-crux',
], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });

let lineBuf = '';
let id = 1;
const pending = new Map();

function send(method, params = {}) {
  const msg = { jsonrpc: '2.0', id: id++, method, params };
  cp.stdin.write(JSON.stringify(msg) + '\n');
  return new Promise((resolve, reject) => pending.set(msg.id, { resolve, reject }));
}

function notify(method, params = {}) {
  cp.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

function text(result) {
  return result.content?.map((c) => c.text || '').join('\n') || '';
}

async function callTool(name, args = {}) {
  const result = await send('tools/call', { name, arguments: args });
  if (result.isError) throw new Error(text(result) || JSON.stringify(result));
  return result;
}

cp.stdout.on('data', (d) => {
  lineBuf += d.toString();
  let i;
  while ((i = lineBuf.indexOf('\n')) >= 0) {
    const line = lineBuf.slice(0, i);
    lineBuf = lineBuf.slice(i + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
    }
  }
});

cp.stderr.on('data', (d) => process.stderr.write(d));

(async () => {
  try {
    await send('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'codex-chrome-mcp-client', version: '0.1.0' },
    });
    notify('notifications/initialized');

    const tools = await send('tools/list', {});
    console.log('Tools:', tools.tools.map((t) => t.name).join(', '));

    await callTool('navigate_page', {
      type: 'url',
      url: 'http://127.0.0.1:8795',
      timeout: 45000,
    });

    console.log(text(await callTool('take_snapshot', {})));
    console.log(text(await callTool('list_console_messages', { pageSize: 20 })));
    console.log(text(await callTool('list_network_requests', { pageSize: 20 })));
  } finally {
    cp.kill();
  }
})().catch((e) => {
  console.error(e.stack || e.message || e);
  try { cp.kill(); } catch {}
  process.exit(1);
});
'@ | node -
```

Change the `navigate_page` URL to the local frontend URL under test.

## Frontend Debugging Workflow

1. Start the app dev server.

```powershell
npm run dev -- --port 8795
```

2. Connect Chrome through MCP with `--autoConnect`.

3. Navigate to the local app:

```js
await callTool('navigate_page', {
  type: 'url',
  url: 'http://127.0.0.1:8795',
  timeout: 45000,
});
```

4. Inspect UI structure before interacting:

```js
await callTool('take_snapshot', {});
```

5. Check runtime errors:

```js
await callTool('list_console_messages', { pageSize: 50 });
```

6. Check failed requests:

```js
await callTool('list_network_requests', { pageSize: 50 });
```

7. Evaluate page state with a serializable function:

```js
await callTool('evaluate_script', {
  function: `() => ({
    url: location.href,
    title: document.title,
    bodyText: document.body.innerText.slice(0, 500),
  })`,
});
```

8. Save a screenshot when visual verification matters:

```js
await callTool('take_screenshot', {
  format: 'png',
  filePath: 'D:\\tmp\\chrome-mcp-debug.png',
});
```

## Connecting To A Dedicated Debug Port

If `--autoConnect` is unavailable, start a separate Chrome with a known DevTools port:

```powershell
Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @(
  '--remote-debugging-port=9222',
  '--user-data-dir=D:\tmp\chrome-debug-profile',
  '--new-window',
  'about:blank'
) -WindowStyle Hidden
```

Verify it:

```powershell
curl.exe -i http://127.0.0.1:9222/json/version
```

Then launch MCP with:

```powershell
node <cached chrome-devtools-mcp entry> --browserUrl http://127.0.0.1:9222 --no-usage-statistics --no-performance-crux
```

## Troubleshooting

`Failed to fetch browser webSocket URL ... /json/version: HTTP Not Found`

The supplied `--browserUrl` is not a Chrome DevTools endpoint. Use `--autoConnect` or a port where `/json/version` returns `webSocketDebuggerUrl`.

`npx` fails with `EPERM` under `AppData\Local\npm-cache`

The sandbox blocked npm cache writes. Rerun the package bootstrap command with elevated permissions.

MCP initialization hangs when launched through `npx.cmd`

Do not keep using `npx.cmd` as the long-running MCP stdio server from a Node child process. Cache the package, locate `build/src/bin/chrome-devtools-mcp.js`, and run it with `node`.

Google or YouTube times out in isolated headless Chrome

Use `--autoConnect` to reuse the user's existing Chrome network/profile configuration. In this session, isolated headless Chrome could reach `example.com` but timed out on Google, while `--autoConnect` reached Google and YouTube.

`navigate` returns an empty tool error in slim mode

Use the full tool set and `navigate_page` for real debugging. It returns clearer status text and exposes the inspection tools needed for frontend work.

Page click does not navigate

Some sites intercept clicks. Prefer MCP `click` with a uid from `take_snapshot`; when using JavaScript fallback, resolve the final `href` and assign `location.href` directly.
