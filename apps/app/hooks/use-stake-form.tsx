import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// Types
import { stakeSchema } from "@/types/schemes";
import type { StakeFormValues, FieldItem } from "@/types/interfaces";

// Utils
import { generateMockStakeData, formatStakeNumber } from "@/utils/number";
import { isCooldownActive, formatCooldown } from "@/utils/date";

// Constants
import { STAKE_FIELDS } from "@/types/constants";

// Components — needed for JSX descriptions in field config
import Avatar from "@/components/atoms/avatar";

/**
 * Manages the stake form state:
 * - Cooldown timer that prevents unstaking until the period expires
 * - Field config with JSX use-max button and token avatar
 * - Mock submit/unstake handlers, will be replaced with contract calls
 */
export function useStakeForm(token: string) {
  const t = useTranslations("stake");
  const { isConnected } = useWallet();
  const stakeData = useMemo(() => generateMockStakeData(token), [token]);

  const form = useForm<StakeFormValues>({
    resolver: zodResolver(stakeSchema),
    defaultValues: { amount: "" },
    mode: "onChange",
  });

  const amountValue = form.watch("amount");
  const numericAmount = parseFloat(amountValue) || 0;

  // Cooldown prevents unstaking for a protocol-defined period after staking
  const cooldownActive = useMemo(
    () => isCooldownActive(stakeData.cooldownEndsAt),
    [stakeData.cooldownEndsAt],
  );

  const cooldownLabel = useMemo(
    () => (cooldownActive ? formatCooldown(stakeData.cooldownEndsAt) : ""),
    [stakeData.cooldownEndsAt, cooldownActive],
  );

  function handleUseMax() {
    form.setValue("amount", stakeData.userBalance.toString(), {
      shouldValidate: true,
    });
  }

  // Mock submit — will be replaced with actual stake contract interaction
  async function onSubmit(data: StakeFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    form.reset();
    console.log("Staked:", data.amount, token);
  }

  function handleUnstake() {
    if (cooldownActive || stakeData.userStaked <= 0) return;
    console.log("Unstaking all for:", token);
  }

  // Field config with JSX elements — can't live in constants due to dynamic descriptions
  const fields: FieldItem[] = STAKE_FIELDS.map((field) => ({
    ...field,
    label: t("amountToStake"),
    ariaLabel: t("amountToStake"),
    endContent: <Avatar name={stakeData.tokenSymbol} size="default" />,
    description: (
      <button
        type="button"
        onClick={handleUseMax}
        className="text-xs text-primary hover:underline"
      >
        {t("useMax", {
          amount: formatStakeNumber(stakeData.userBalance),
          token: stakeData.tokenSymbol,
        })}
      </button>
    ),
  }));

  return {
    t,
    form,
    isConnected,
    stakeData,
    numericAmount,
    cooldownActive,
    cooldownLabel,
    fields,
    onSubmit,
    handleUnstake,
  };
}
