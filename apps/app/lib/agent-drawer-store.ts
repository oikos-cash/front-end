"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const MIN_HEIGHT = 240;
const MAX_HEIGHT_VH = 0.9;
const DEFAULT_HEIGHT = 480;

interface State {
  // Ratchet: flips true on first open and never back. While false, the
  // drawer body is not rendered at all (so the WebContainer iframe never
  // mounts). Once true, the iframe stays mounted across collapses and
  // route changes — closing the drawer just hides it.
  mountedEver: boolean;
  open: boolean;
  height: number;
  maximized: boolean;
}

interface Actions {
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setHeight: (height: number) => void;
  setMaximized: (maximized: boolean) => void;
}

const clampHeight = (px: number): number => {
  const max =
    typeof window !== "undefined"
      ? Math.floor(window.innerHeight * MAX_HEIGHT_VH)
      : 800;
  return Math.max(MIN_HEIGHT, Math.min(max, Math.round(px)));
};

export const useAgentDrawerStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      mountedEver: false,
      open: false,
      height: DEFAULT_HEIGHT,
      maximized: false,
      toggle: () => {
        const next = !get().open;
        set({ open: next, mountedEver: get().mountedEver || next });
      },
      setOpen: (open) => {
        set({ open, mountedEver: get().mountedEver || open });
      },
      setHeight: (height) => {
        set({ height: clampHeight(height) });
      },
      setMaximized: (maximized) => set({ maximized }),
    }),
    {
      name: "oikos.agent-drawer",
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences. `open` and `mountedEver` are
      // session-scoped — we don't want the iframe to auto-boot on every
      // page load just because the user once opened the drawer.
      partialize: (s) => ({ height: s.height, maximized: s.maximized }),
    },
  ),
);

export const AGENT_DRAWER_MIN_HEIGHT = MIN_HEIGHT;
export const AGENT_DRAWER_MAX_HEIGHT_VH = MAX_HEIGHT_VH;
