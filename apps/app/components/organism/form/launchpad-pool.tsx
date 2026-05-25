"use client";

// Components
import LaunchpadSection from "@/components/molecules/launchpad/section";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLaunchpadStore } from "@/stores/launchpad";

// Types
import { launchpadPoolSchema } from "@/types/schemes";
import type {
  FieldItem,
  I18nCardConfig,
  LaunchpadPoolFormValues,
} from "@/types/interfaces";
import {
  LAUNCHPAD_POOL_SELECT_ITEMS,
  LAUNCHPAD_POOL_FIELD_OVERRIDES,
} from "@/types/constants";

// Utils
import { minTotalSupplyTokensForFloor } from "@/utils/launchpad-supply";
import { formatCompactNumber } from "@/utils/number";

export default function LaunchpadPoolForm() {
  const t = useTranslations("launchpad");
  const store = useLaunchpadStore();
  const cards = t.raw("poolPage.cards") as I18nCardConfig[];
  const form = useForm<LaunchpadPoolFormValues>({
    resolver: zodResolver(launchpadPoolSchema),
    defaultValues: {
      floorPrice: store.floorPrice,
      totalSupply: store.totalSupply,
      reserveAsset: store.reserveAsset,
      protocol: store.protocol,
    },
    mode: "onChange",
  });

  const values = form.watch();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    const unsub = useLaunchpadStore.persist.onFinishHydration(() => {
      const s = useLaunchpadStore.getState();
      form.reset({
        floorPrice: s.floorPrice,
        totalSupply: s.totalSupply,
        reserveAsset: s.reserveAsset,
        protocol: s.protocol,
      });
      hydrated.current = true;
    });
    if (useLaunchpadStore.persist.hasHydrated()) {
      const s = useLaunchpadStore.getState();
      form.reset({
        floorPrice: s.floorPrice,
        totalSupply: s.totalSupply,
        reserveAsset: s.reserveAsset,
        protocol: s.protocol,
      });
      hydrated.current = true;
    }
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated.current) return;
    store.setPoolConfig(values);
    if (form.formState.isValid) {
      store.markStepCompleted(1);
    }
  }, [
    values.floorPrice,
    values.totalSupply,
    values.reserveAsset,
    values.protocol,
    form.formState.isValid,
  ]);

  // Min total supply required by SupplyRules.enforceMinTotalSupply for
  // the user's current floor price. Mirrored client-side so the user
  // can't sign a tx that the factory will revert.
  const minSupplyTokens = useMemo(
    () => minTotalSupplyTokensForFloor(values.floorPrice),
    [values.floorPrice],
  );

  function applyMinSupply() {
    if (minSupplyTokens === null) return;
    form.setValue("totalSupply", minSupplyTokens.toString(), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {cards.map((card, i) => {
        const hasTotalSupply = card.fields.some((f) => f.name === "totalSupply");
        return (
          <LaunchpadSection
            key={i}
            index={i + 1}
            title={card.title}
            description={card.description}
            help={card.help}
            required={card.required}
          >
            <FieldRenderer
              control={form.control}
              t={t}
              fields={card.fields.map(
                (f) =>
                  ({
                    ...f,
                    ...(f.type === "select" && {
                      items: LAUNCHPAD_POOL_SELECT_ITEMS[f.name] ?? [],
                      defaultValue: store[f.name as keyof typeof store] as string,
                    }),
                    ...LAUNCHPAD_POOL_FIELD_OVERRIDES[f.name],
                  }) as FieldItem,
              )}
            />
            {hasTotalSupply && minSupplyTokens !== null && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background/40 px-3 py-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="eyebrow">{t("supplyHint")}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatCompactNumber(Number(minSupplyTokens))} tokens
                  </span>
                </div>
                <button
                  type="button"
                  onClick={applyMinSupply}
                  className="rounded border border-primary/35 bg-primary/10 px-2 py-1 text-2xs font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/15"
                >
                  {t("supplyApplyMin")}
                </button>
              </div>
            )}
          </LaunchpadSection>
        );
      })}
    </div>
  );
}
