"use client";

import { useState } from "react";

// Components
import Link from "next/link";
import Button from "@/components/atoms/button";

// Hooks
import { useTranslations } from "next-intl";
import { useLaunchpadStore } from "@/stores/launchpad";
import { usePathname, useRouter } from "next/navigation";

// Constants
import { LAUNCHPAD_STEPS, LAUNCHPAD_STEP_LABELS } from "@/types/constants";

// Icons
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function LaunchpadSidebar({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("launchpad");
  const pathname = usePathname();
  const router = useRouter();
  const {
    reset,
    tokenSymbol,
    enablePresale,
    completedSteps,
    isReadyToDeploy,
    markStepCompleted,
  } = useLaunchpadStore();
  const [isDeploying, setIsDeploying] = useState(false);

  const currentIndex = LAUNCHPAD_STEPS.findIndex((step) =>
    pathname.endsWith(step.path),
  );
  const prevStep = currentIndex > 0 ? LAUNCHPAD_STEPS[currentIndex - 1] : null;
  const nextStep =
    currentIndex < LAUNCHPAD_STEPS.length - 1
      ? LAUNCHPAD_STEPS[currentIndex + 1]
      : null;

  return (
    <div className="flex gap-6 py-4">
      <nav className="flex w-56 shrink-0 flex-col gap-4 lg:sticky lg:top-18 lg:self-start">
        <ul className="flex flex-col">
          {LAUNCHPAD_STEPS.map((step, index) => {
            const isActive = pathname.endsWith(step.path);
            const isCompleted = completedSteps.includes(index);
            const isPresaleStep = index === 2;
            return (
              <li key={step.path}>
                <Link
                  href={step.path}
                  className={`group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{t(LAUNCHPAD_STEP_LABELS[index])}</span>
                  {isCompleted && (
                    <span className="size-1.5 rounded-full bg-primary" />
                  )}
                  {isPresaleStep && !enablePresale && (
                    <span className="text-xs text-muted-foreground">
                      {t("skipped")}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            size="xs"
            variant="ghost"
            disabled={!prevStep}
            onClick={() => prevStep && router.push(prevStep.path)}
          >
            <ChevronLeft className="size-4" />
            {t("back")}
          </Button>
          {nextStep ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => router.push(nextStep.path)}
            >
              {t("next")}
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              disabled={!isReadyToDeploy() || isDeploying}
              isLoading={isDeploying}
              onClick={async () => {
                setIsDeploying(true);
                const symbol = tokenSymbol.toLowerCase();
                const hasPresale = enablePresale;
                await new Promise((r) => setTimeout(r, 3000));
                markStepCompleted(3);
                reset();
                setIsDeploying(false);
                router.push(
                  hasPresale ? `/presale/${symbol}` : `/liquidity/${symbol}`,
                );
              }}
            >
              {t("deployButton")}
            </Button>
          )}
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
