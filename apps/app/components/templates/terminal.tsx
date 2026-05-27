"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAgentDrawerStore } from "@/lib/agent-drawer-store";

// /terminal is no longer a standalone page — the agent shell lives in
// the bottom drawer mounted in the locale layout, so it's always
// available across routes. Hitting /terminal directly is a polite way
// of asking for it maximized: open the drawer fullscreen and bounce
// the user to /.
export default function TerminalTemplate(): null {
  const router = useRouter();
  useEffect(() => {
    const s = useAgentDrawerStore.getState();
    s.setMaximized(true);
    s.setOpen(true);
    router.replace("/");
  }, [router]);
  return null;
}
