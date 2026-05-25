"use client";

import { useForm } from "react-hook-form";
import { useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import Empty from "@/components/atoms/empty";
import FieldRenderer from "@/components/molecules/field-renderer";
import LaunchpadSection from "@/components/molecules/launchpad/section";

// Hooks
import { useTranslations } from "next-intl";
import { useLaunchpadStore } from "@/stores/launchpad";

// Utils
import { formatStakeNumber } from "@/utils/number";

// Types
import { launchpadPresaleSchema } from "@/types/schemes";
import type {
  FieldItem,
  I18nCardConfig,
  LaunchpadPresaleFormValues,
} from "@/types/interfaces";
import {
  LAUNCHPAD_PRESALE_SELECT_ITEMS,
  LAUNCHPAD_PRESALE_FIELD_OVERRIDES,
} from "@/types/constants";

// Icons
import { Info } from "lucide-react";

export default function LaunchpadPresaleForm() {
  const t = useTranslations("launchpad");
  const store = useLaunchpadStore();

  const cards = t.raw("presalePage.cards") as I18nCardConfig[];

  const form = useForm<LaunchpadPresaleFormValues>({
    resolver: zodResolver(launchpadPresaleSchema),
    defaultValues: {
      presaleDuration: store.presaleDuration,
      softCapPercent: store.softCapPercent,
    },
    mode: "onChange",
  });

  const values = form.watch();
  const hydrated = useRef(false);

  const hardCap = useMemo(() => {
    const price = parseFloat(store.floorPrice) || 0;
    const supply = parseFloat(store.totalSupply) || 0;
    return price * supply * 0.1;
  }, [store.floorPrice, store.totalSupply]);

  const softCap = useMemo(() => {
    return hardCap * (values.softCapPercent / 100);
  }, [hardCap, values.softCapPercent]);

  useEffect(() => {
    if (hydrated.current) return;
    const unsub = useLaunchpadStore.persist.onFinishHydration(() => {
      const s = useLaunchpadStore.getState();
      form.reset({
        presaleDuration: s.presaleDuration,
        softCapPercent: s.softCapPercent,
      });
      hydrated.current = true;
    });
    if (useLaunchpadStore.persist.hasHydrated()) {
      const s = useLaunchpadStore.getState();
      form.reset({
        presaleDuration: s.presaleDuration,
        softCapPercent: s.softCapPercent,
      });
      hydrated.current = true;
    }
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated.current) return;
    if (!store.enablePresale) {
      store.markStepCompleted(2);
      return;
    }
    store.setPresaleConfig(values);
    if (form.formState.isValid) {
      store.markStepCompleted(2);
    }
  }, [
    values.presaleDuration,
    values.softCapPercent,
    form.formState.isValid,
    store.enablePresale,
  ]);

  if (!store.enablePresale) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-6">
        <Empty
          title=""
          description={t("presaleDisabled")}
          icon={<Info className="size-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  // Inline read-only metric row matching LaunchpadSection's plate look.
  const Metric = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <div className="flex items-baseline justify-between gap-3 rounded-xl border border-border/40 bg-card/40 px-4 py-3">
      <span className="eyebrow">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric
          label={t("presalePrice")}
          value={`${formatStakeNumber(parseFloat(store.floorPrice) || 0, 7, true)} BNB`}
        />
        <Metric
          label={t("hardCap")}
          value={`${formatStakeNumber(hardCap, 4, true)} BNB`}
        />
        <Metric
          label={t("softCap")}
          value={`${formatStakeNumber(softCap, 4, true)} BNB · ${values.softCapPercent}%`}
        />
      </div>

      {cards.map((card, i) => (
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
                    items: LAUNCHPAD_PRESALE_SELECT_ITEMS[f.name] ?? [],
                    defaultValue: store[f.name as keyof typeof store] as string,
                  }),
                  ...LAUNCHPAD_PRESALE_FIELD_OVERRIDES[f.name],
                }) as FieldItem,
            )}
          />
        </LaunchpadSection>
      ))}
    </div>
  );
}
