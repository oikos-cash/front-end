#!/usr/bin/env node
/**
 * Copy the latest agent-wasm guest bundles into apps/app/public/guest/
 * and re-apply the StackBlitz-only OIKOS_REQUIRE_SHIM prelude.
 *
 * Run after `npm run bundle:guest` in /data2/code/Oikos/agent-wasm:
 *
 *   pnpm --filter app sync:guest
 *
 * (or just `pnpm sync:guest` from apps/app)
 *
 * Why the shim: esbuild's bundle emits `typeof require !== "undefined"`
 * in its __require fallback. StackBlitz's ESM Node realm doesn't have
 * a `require` in scope by default, so we inject a module-scope one via
 * createRequire(import.meta.url). Without it, any dep that does a
 * dynamic require (dotenv, etc.) blows up on first call.
 */
import { readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// apps/app/scripts → apps/app → apps → front-end → Oikos → agent-wasm
const AGENT_WASM = resolve(__dirname, '..', '..', '..', '..', 'agent-wasm');
const SRC_DIR = resolve(AGENT_WASM, 'public', 'guest');
const DEST_DIR = resolve(__dirname, '..', 'public', 'guest');

const FILES = ['agent.bundle.mjs', 'mcp-server.bundle.mjs', 'agent-entry.mjs'];
const SHIMMED_FILES = new Set(['agent.bundle.mjs', 'mcp-server.bundle.mjs']);

const SHIM = `#!/usr/bin/env node
// OIKOS_REQUIRE_SHIM — installs a module-scope require so esbuild's
// __require shim (which checks \`typeof require !== "undefined"\`)
// finds one when this bundle is evaluated under StackBlitz's ESM Node
// runtime. Harmless on kernels that already expose require.
import { createRequire as __oikosCR } from 'node:module';
const require = __oikosCR(import.meta.url);
`;

function fmtBytes(n) {
  return n > 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(2)} MiB`
    : `${(n / 1024).toFixed(1)} KiB`;
}

function ensureDir(path) {
  try {
    mkdirSync(path, { recursive: true });
  } catch {
    /* exists */
  }
}

function main() {
  // Validate source exists
  for (const name of FILES) {
    const src = resolve(SRC_DIR, name);
    try {
      statSync(src);
    } catch {
      console.error(
        `[sync-guest] missing source ${src}\n` +
          `  Run \`npm run bundle:guest\` in ${AGENT_WASM} first.`,
      );
      process.exit(1);
    }
  }

  ensureDir(DEST_DIR);

  let copied = 0;
  let shimmed = 0;
  for (const name of FILES) {
    const src = resolve(SRC_DIR, name);
    const dest = resolve(DEST_DIR, name);
    let body = readFileSync(src, 'utf8');

    if (SHIMMED_FILES.has(name) && !body.includes('OIKOS_REQUIRE_SHIM')) {
      // Drop the existing shebang line and prepend our shim (which
      // carries its own shebang).
      const afterShebang = body.startsWith('#!') ? body.slice(body.indexOf('\n') + 1) : body;
      body = SHIM + afterShebang;
      shimmed += 1;
    }

    writeFileSync(dest, body);
    copied += 1;
    const size = statSync(dest).size;
    console.log(`[sync-guest] ${name.padEnd(24)} ${fmtBytes(size).padStart(10)}`);
  }

  console.log(`[sync-guest] done — ${copied} files copied, ${shimmed} shimmed`);
  console.log(`             dest: ${DEST_DIR}`);
}

main();
