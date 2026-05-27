"use client";

import { useEffect } from "react";
import { TerminalSquare } from "lucide-react";

import { useAgentDrawerStore } from "@/lib/agent-drawer-store";

// Ctrl/⌘+` mirrors browser devtools muscle memory. The chip itself is
// pointer/touch escape hatch for users who don't know the shortcut.

export default function AgentDrawerChip(): React.ReactElement | null {
  const open = useAgentDrawerStore((s) => s.open);
  const autoHide = useAgentDrawerStore((s) => s.autoHide);
  const toggle = useAgentDrawerStore((s) => s.toggle);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "`") return;
      if (!(event.ctrlKey || event.metaKey)) return;
      // Don't swallow the shortcut while the user is typing in the
      // terminal itself — xterm captures focus so this guard only
      // matters for inputs outside the drawer.
      const target = event.target as HTMLElement | null;
      if (target && target.closest("input, textarea, [contenteditable=true]")) {
        return;
      }
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // In dock auto-hide mode the chip would defeat the whole point — the
  // bottom edge itself is the affordance. Render a small handle pill
  // anchored to the bottom center so the user can see where the dock
  // is parked. Inline styles because the Tailwind v4 opacity modifier
  // on `bg-primary` doesn't resolve for CSS-var-backed colors here.
  if (autoHide) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30"
      >
        <div
          style={{
            height: "2px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(245,200,67,0.55) 50%, transparent 100%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            height: "5px",
            width: "112px",
            borderTopLeftRadius: "9999px",
            borderTopRightRadius: "9999px",
            background: "rgba(245,200,67,0.85)",
            boxShadow:
              "0 -4px 16px rgba(245,200,67,0.45), 0 0 2px rgba(245,200,67,0.9)",
          }}
        />
      </div>
    );
  }

  if (open) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Open agent terminal"
      className={[
        "fixed bottom-4 right-4 z-30 hidden sm:inline-flex",
        "items-center gap-2 rounded-full border border-border/60 bg-card/95 backdrop-blur",
        "px-3 py-2 text-xs font-medium text-foreground",
        "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] transition-colors",
        "hover:border-primary/40 hover:bg-card",
      ].join(" ")}
    >
      <TerminalSquare className="size-3.5 text-primary" />
      <span>Agent</span>
      <kbd className="ml-1 hidden rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
        ⌃`
      </kbd>
    </button>
  );
}
