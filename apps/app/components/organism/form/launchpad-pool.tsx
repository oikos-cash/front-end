"use client";

// Components
import Card from "@/components/atoms/card";
import Badge from "@/components/atoms/badge";
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

  const fdv = useMemo(() => {
    const price = parseFloat(values.floorPrice) || 0;
    const supply = parseFloat(values.totalSupply) || 0;
    return price * supply;
  }, [values.floorPrice, values.totalSupply]);

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

  return (
    <>
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
                    items: LAUNCHPAD_POOL_SELECT_ITEMS[f.name] ?? [],
                    defaultValue: store[f.name as keyof typeof store] as string,
                  }),
                  ...LAUNCHPAD_POOL_FIELD_OVERRIDES[f.name],
                }) as FieldItem,
            )}
          />
        </Card>
      ))}

      <Card title={t("summaryTitle")} description={t("summaryDesc")}>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("floorPrice")}</span>
            <span className="font-medium">{values.floorPrice || "0"} BNB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("calculatedFdv")}</span>
            <span className="font-medium">{fdv.toLocaleString()} BNB</span>
          </div>
        </div>
      </Card>
    </>
  );
}
