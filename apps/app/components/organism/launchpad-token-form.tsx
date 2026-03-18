"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Components
import Badge from "@/components/atoms/badge";
import Card from "@/components/atoms/card";
import FieldRenderer from "@/components/molecules/field-renderer";

// Hooks
import { useTranslations } from "next-intl";
import { useLaunchpadStore } from "@/stores/launchpad";

// Types
import { launchpadTokenSchema } from "@/types/schemes";
import type {
  FieldItem,
  I18nCardConfig,
  LaunchpadTokenFormValues,
} from "@/types/interfaces";

const FIELD_OVERRIDES: Record<string, Partial<FieldItem>> = {
  tokenDescription: { maxLength: 500, rows: 4 } as Partial<FieldItem>,
  tokenLogoUrl: {
    accept: "image/png,image/jpeg,image/svg+xml,image/webp",
  } as Partial<FieldItem>,
};

export default function LaunchpadTokenForm() {
  const t = useTranslations("launchpad");
  const store = useLaunchpadStore();

  const cards = t.raw("tokenPage.cards") as I18nCardConfig[];

  const form = useForm<LaunchpadTokenFormValues>({
    resolver: zodResolver(launchpadTokenSchema),
    defaultValues: {
      tokenName: store.tokenName,
      tokenSymbol: store.tokenSymbol,
      tokenDescription: store.tokenDescription,
      enablePresale: store.enablePresale ? "yes" : "no",
      tokenLogoUrl: store.tokenLogoUrl,
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
        tokenName: s.tokenName,
        tokenSymbol: s.tokenSymbol,
        tokenDescription: s.tokenDescription,
        enablePresale: s.enablePresale ? "yes" : "no",
        tokenLogoUrl: s.tokenLogoUrl,
      });
      hydrated.current = true;
    });
    if (useLaunchpadStore.persist.hasHydrated()) {
      const s = useLaunchpadStore.getState();
      form.reset({
        tokenName: s.tokenName,
        tokenSymbol: s.tokenSymbol,
        tokenDescription: s.tokenDescription,
        enablePresale: s.enablePresale ? "yes" : "no",
        tokenLogoUrl: s.tokenLogoUrl,
      });
      hydrated.current = true;
    }
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated.current) return;
    store.setTokenInfo({
      tokenName: values.tokenName,
      tokenSymbol: values.tokenSymbol,
      tokenDescription: values.tokenDescription,
      enablePresale: values.enablePresale === "yes",
      tokenLogoUrl: values.tokenLogoUrl,
    });
    if (form.formState.isValid) {
      store.markStepCompleted(0);
    }
  }, [
    values.tokenName,
    values.tokenSymbol,
    values.tokenDescription,
    values.enablePresale,
    values.tokenLogoUrl,
    form.formState.isValid,
  ]);

  function getSelectItems(name: string) {
    if (name === "enablePresale") {
      return [
        { value: "yes", label: t("enablePresaleYes") },
        { value: "no", label: t("enablePresaleNo") },
      ];
    }
    return [];
  }

  function getSelectDefault(name: string) {
    if (name === "enablePresale") return store.enablePresale ? "yes" : "no";
    return undefined;
  }

  return (
    <>
      {cards.map((card, i) => (
        <Card
          key={i}
          title={card.title}
          description={card.description}
          action={
            card.required && (
              <Badge className="bg-blue-500/10 text-blue-500">{t("required")}</Badge>
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
                    items: getSelectItems(f.name),
                    defaultValue: getSelectDefault(f.name),
                  }),
                  ...FIELD_OVERRIDES[f.name],
                }) as FieldItem,
            )}
          />
        </Card>
      ))}
    </>
  );
}
