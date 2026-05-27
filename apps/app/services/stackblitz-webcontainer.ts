/**
 * StackBlitz WebContainer adapter — boots an in-browser container via
 * `@webcontainer/api` and exposes the same `WebContainerClient`
 * surface as the OSS WS adapter so the React layer is agnostic.
 *
 * Key differences from the OSS backend:
 *   • The container runs in the same browser tab (no network hop). It
 *     requires cross-origin isolation (COOP/COEP); see next.config.ts.
 *   • `WebContainer.boot()` is process-singleton — calling it twice in
 *     the same page rejects. We dedupe with a module-level promise.
 *   • Pids are local-only; StackBlitz doesn't surface OS pids.
 *   • Signals don't propagate; `kill()` just tears the process down.
 */
import {
  WebContainer,
  type WebContainerProcess,
} from "@webcontainer/api";

import type {
  SpawnHandle,
  SpawnOptions,
  WebContainerClient,
} from "./webcontainer";

let bootPromise: Promise<WebContainer> | null = null;
let bootedWorkdir: string | null = null;

interface BootOptions {
  /** Container workdir / home directory name. Set once per page; later
   *  calls with a different value are rejected because the WC singleton
   *  can't be re-booted in the same tab. */
  workdirName?: string;
}

function getBootedContainer(opts: BootOptions = {}): Promise<WebContainer> {
  const wanted = opts.workdirName ?? "oikos-terminal";
  if (bootPromise) {
    if (bootedWorkdir && bootedWorkdir !== wanted) {
      // WC singleton has already been booted with a different workdir
      // (typical when HMR re-evaluates the calling module while
      // StackBlitz's iframe + service worker keep the prior container
      // alive). Reusing the existing one is the only option — a hard
      // reload would be needed to actually rebind.
      console.warn(
        `[stackblitz] WebContainer already booted with workdirName="${bootedWorkdir}"; ` +
          `requested "${wanted}". Reusing existing container.`,
      );
    }
    return bootPromise;
  }
  bootedWorkdir = wanted;
  bootPromise = WebContainer.boot({ workdirName: wanted }).catch((err) => {
    bootPromise = null;
    bootedWorkdir = null;
    throw err;
  });
  return bootPromise;
}

/**
 * Returns a `WebContainerClient` backed by a StackBlitz WebContainer
 * instance booted in this tab. Multiple calls reuse the same singleton
 * container — only the per-client process bookkeeping and listeners
 * are fresh.
 */
export function connectStackBlitzWebContainer(
  bootOpts: BootOptions = {},
): WebContainerClient {
  let ready = false;
  let container: WebContainer | null = null;
  let nextLocalPid = 1;

  const processes = new Map<number, WebContainerProcess>();
  const outputListeners = new Map<number, Set<(chunk: Uint8Array) => void>>();
  const exitListeners = new Map<
    number,
    Set<(code: number, signal: string | null) => void>
  >();
  const connectionListeners = new Set<(connected: boolean) => void>();
  const encoder = new TextEncoder();

  getBootedContainer(bootOpts)
    .then((inst) => {
      container = inst;
      // DEBUG: expose for browser-console inspection during integration
      (globalThis as { __wc?: unknown }).__wc = inst;
      ready = true;
      for (const cb of connectionListeners) cb(true);
    })
    .catch((err) => {
      console.error("[stackblitz] WebContainer.boot() failed", err);
      for (const cb of connectionListeners) cb(false);
    });

  function emitOutput(pid: number, chunk: Uint8Array) {
    const listeners = outputListeners.get(pid);
    if (listeners) for (const cb of listeners) cb(chunk);
  }

  function emitExit(pid: number, code: number) {
    const listeners = exitListeners.get(pid);
    if (listeners) for (const cb of listeners) cb(code, null);
  }

  return {
    isReady: () => ready,
    writeFile: async (path, contents) => {
      const inst = container ?? (await getBootedContainer(bootOpts));
      container = inst;
      await inst.fs.writeFile(path, contents as never);
    },
    mkdir: async (path, mkdirOpts) => {
      const inst = container ?? (await getBootedContainer(bootOpts));
      container = inst;
      if (mkdirOpts?.recursive) {
        await inst.fs.mkdir(path, { recursive: true });
      } else {
        await inst.fs.mkdir(path);
      }
    },
    spawn: async (opts: SpawnOptions): Promise<SpawnHandle> => {
      const inst = container ?? (await getBootedContainer(bootOpts));
      container = inst;

      const [command, ...args] = opts.command;
      if (!command) {
        throw new Error("spawn: SpawnOptions.command must be a non-empty argv");
      }

      const proc = await inst.spawn(command, args, {
        terminal:
          opts.cols && opts.rows
            ? { cols: opts.cols, rows: opts.rows }
            : undefined,
        env: opts.env,
        // StackBlitz spawn doesn't accept `cwd`; the process starts at
        // the container's workdir (i.e. /home/<workdirName>).
      });

      const pid = nextLocalPid++;
      processes.set(pid, proc);

      // output is `ReadableStream<string>` — adapt to Uint8Array so the
      // listener contract matches the OSS backend.
      void (async () => {
        const reader = proc.output.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value === undefined) continue;
            emitOutput(
              pid,
              typeof value === "string" ? encoder.encode(value) : value,
            );
          }
        } catch (err) {
          console.debug("[stackblitz] output reader closed", err);
        }
      })();

      void proc.exit
        .then((code) => {
          processes.delete(pid);
          emitExit(pid, code);
        })
        .catch(() => {
          processes.delete(pid);
          emitExit(pid, -1);
        });

      const inputWriter = proc.input.getWriter();
      const decoder = new TextDecoder();

      return {
        pid,
        writeStdin: (chunk) => {
          const text =
            typeof chunk === "string" ? chunk : decoder.decode(chunk);
          inputWriter.write(text).catch(() => {
            /* writer closed — process likely exited */
          });
        },
        resize: (cols, rows) => {
          try {
            proc.resize({ cols, rows });
          } catch {
            /* process gone */
          }
        },
        kill: () => {
          try {
            proc.kill();
          } catch {
            /* already dead */
          }
        },
      };
    },
    onOutput: (pid, listener) => {
      let set = outputListeners.get(pid);
      if (!set) {
        set = new Set();
        outputListeners.set(pid, set);
      }
      set.add(listener);
      return () => {
        const s = outputListeners.get(pid);
        if (!s) return;
        s.delete(listener);
        if (s.size === 0) outputListeners.delete(pid);
      };
    },
    onExit: (pid, listener) => {
      let set = exitListeners.get(pid);
      if (!set) {
        set = new Set();
        exitListeners.set(pid, set);
      }
      set.add(listener);
      return () => {
        const s = exitListeners.get(pid);
        if (!s) return;
        s.delete(listener);
        if (s.size === 0) exitListeners.delete(pid);
      };
    },
    onConnectionChange: (listener) => {
      connectionListeners.add(listener);
      // Late subscribers still need to learn we're already up — the
      // OSS backend leans on the WS open event firing after the React
      // effect attaches, but boot resolves only once per page.
      if (ready) {
        try {
          listener(true);
        } catch {
          /* listener errors shouldn't cascade */
        }
      }
      return () => {
        connectionListeners.delete(listener);
      };
    },
    close: () => {
      for (const proc of processes.values()) {
        try {
          proc.kill();
        } catch {
          /* ignore */
        }
      }
      processes.clear();
      // Intentionally do NOT teardown the singleton container — repeat
      // mounts on /terminal would otherwise pay the boot cost every
      // time. The container dies with the page.
    },
  };
}
