"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Rocket, LineChart, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/atoms/ui/dialog";

import { useWallet } from "@/stores/wallet";
import {
  type UserRole,
  shouldShowRoleSelector,
  useOnboardingStore,
} from "@/stores/onboarding";
import { cn } from "@/utils/object";

/**
 * First-touch role chooser. Pops the first time the user connects a
 * wallet, asks whether they're here to launch a token or to trade, and
 * stores the answer locally so we can tailor downstream UI nudges. The
 * Trader path is shown but locked behind a "Coming Soon" pill — only
 * the Creator path is wired today.
 *
 * Mount once at the top of the global layout; the store gates rendering.
 */
export default function RoleSelectorModal() {
  const { isConnected } = useWallet();
  const role = useOnboardingStore((s) => s.role);
  const skipped = useOnboardingStore((s) => s.skipped);
  const setRole = useOnboardingStore((s) => s.setRole);
  const skip = useOnboardingStore((s) => s.skip);

  // SSR/CSR alignment: the persisted store rehydrates on the client only,
  // so the modal is rendered post-mount to avoid hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const open =
    mounted && shouldShowRoleSelector(isConnected, { role, skipped });

  function handleSelect(next: UserRole) {
    setRole(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Treat any outside-click / Esc as "skip for now". The user can
        // still pick later from settings (todo) or via a reminder banner.
        if (!next) skip();
      }}
    >
      <DialogContent
        className={cn(
          // Match the launchpad / swap card surface: warm radial top
          // sheen, lit edge, generous padding.
          "max-w-[520px] gap-0 overflow-hidden border-border/60 bg-card p-0",
          "shadow-[0_25px_80px_-20px_rgba(0,0,0,0.7),0_0_60px_-10px_rgba(245,200,67,0.12)]",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "relative px-6 pt-8 pb-6 text-center",
            "border-b border-border/40",
            "bg-[radial-gradient(ellipse_80%_120%_at_50%_0%,rgba(245,200,67,0.16),transparent_70%)]",
          )}
        >
          {/* Brand mark */}
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-border/60 bg-background/60 p-3">
            <Image
              src="/favicon.png"
              alt="Oikos"
              width={40}
              height={40}
              className="size-full object-contain"
            />
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            Welcome to Oikos
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            How do you plan to use Oikos?
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 px-6 py-6">
          <RoleCard
            onClick={() => handleSelect("creator")}
            icon={<Rocket className="size-5" strokeWidth={2.5} />}
            iconTone="from-violet-500 to-violet-600 shadow-[0_8px_24px_-8px_rgba(139,92,246,0.55)]"
            title="I'm a Creator"
            description="Launch your own token, build a community, and engage with early supporters."
          />
          <RoleCard
            disabled
            icon={<LineChart className="size-5" strokeWidth={2.5} />}
            iconTone="from-sky-500 to-sky-600 opacity-60"
            title="I'm a Trader"
            description="Discover new tokens, trade on the bonding curve, and join exciting launches."
            badge="Coming Soon"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center border-t border-border/40 bg-background/40 px-6 py-3">
          <button
            type="button"
            onClick={skip}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            <X className="size-3" />
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoleCard({
  onClick,
  icon,
  iconTone,
  title,
  description,
  badge,
  disabled,
}: {
  onClick?: () => void;
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
}) {
  const Comp = disabled ? "div" : "button";
  return (
    <Comp
      type={disabled ? undefined : "button"}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      className={cn(
        "group relative flex w-full items-center gap-4 rounded-xl border bg-card/60 p-4 text-left transition-all",
        disabled
          ? "cursor-not-allowed border-border/40 opacity-50"
          : "border-border/60 hover:-translate-y-px hover:border-primary/45 hover:bg-card/80 hover:shadow-[0_0_0_1px_rgba(245,200,67,0.18),0_8px_28px_-14px_rgba(245,200,67,0.32)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
          iconTone,
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground/85">
          {description}
        </span>
      </span>
      {badge && (
        <span className="ml-auto shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em] text-primary/90">
          {badge}
        </span>
      )}
    </Comp>
  );
}
