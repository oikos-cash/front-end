"use client";

import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useTranslations } from "next-intl";
import { useLaunchpadStore } from "@/stores/launchpad";

// Types
import { launchpadPresaleSchema } from "@/types/schemes";
import type {
  FieldItem,
  I18nCardConfig,
  LaunchpadPresaleFormValues,
} from "@/types/interfaces";
import { PRESALE_DURATION_OPTIONS } from "@/types/constants";

// Icons
import { Info } from "lucide-react";

const SELECT_ITEMS: Record<string, { value: string; label: string }[]> = {
  presaleDuration: PRESALE_DURATION_OPTIONS,
};

const FIELD_OVERRIDES: Record<string, Partial<FieldItem>> = {
  softCapPercent: { min: 20, max: 60, step: 1 } as Partial<FieldItem>,
};

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
      <Card>
        <Empty
          title=""
          description={t("presaleDisabled")}
          icon={<Info className="size-6 text-muted-foreground" />}
        />
      </Card>
    );
  }

  return (
    <>
      <Card title={t("presalePrice")}>
        <span className="text-sm font-medium">
          {store.floorPrice || "0"} BNB
        </span>
      </Card>

      {cards.map((card, i) => (
        <Card
          key={i}
          title={card.title}
          description={card.description}
          action={
            card.required && (
              <Badge className="bg-blue-500/10 text-blue-500">
                {t("required")}
              </Badge>
            )
          }
          footer={
            card.help && (
              <span className="text-xs text-muted-foreground">{card.help}</span>
            )
          }
        >
          <FieldRenderer
            control={form.control}
            t={t}
            fields={card.fields.map(
              (f) =>
                ({
                  ...f,
                  ...(f.type === "select" && {
                    items: SELECT_ITEMS[f.name] ?? [],
                    defaultValue: store[f.name as keyof typeof store] as string,
                  }),
                  ...FIELD_OVERRIDES[f.name],
                }) as FieldItem,
            )}
          />
        </Card>
      ))}

      <Card title={t("hardCap")}>
        <span className="text-sm font-medium">
          {hardCap.toLocaleString()} BNB
        </span>
      </Card>

      <Card>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("softCap")}</span>
          <span className="font-medium">
            {softCap.toLocaleString()} BNB ({values.softCapPercent}%)
          </span>
        </div>
      </Card>
    </>
  );
}
