import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";
import { useStaking } from "@/hooks/use-staking";

// Types
import { stakeSchema } from "@/types/schemes";
import type { StakeFormValues, FieldItem, VaultInfo } from "@/types/interfaces";

// Utils
import { formatStakeNumber } from "@/utils/number";

// Constants
import { STAKE_FIELDS } from "@/types/constants";

// Components
import Avatar from "@/components/atoms/avatar";

/**
 * Manages the stake form state with real contract interactions:
 * - Reads token balance and allowance from blockchain
 * - Approve + Stake contract writes
 * - Cooldown timer from on-chain data
 */
export function useStakeForm(vault: VaultInfo | null) {
  const t = useTranslations("stake");
  const { isConnected } = useWallet();
  const tokenSymbol = vault?.tokenSymbol ?? "TOKEN";

  const {
    tokenBalance,
    stakedBalance,
    sTokenBalance,
    totalRewards,
    needsApproval,
    isCooldownActive,
    cooldownEnd,
    approve,
    stake,
    unstake,
    isApproving,
    isStaking,
    isUnstaking,
  } = useStaking(vault?.stakingContract, vault?.token0, vault?.sTokenAddress ?? vault?.sToken);

  const userBalance = tokenBalance ? Number(tokenBalance) / 1e18 : 0;
  const userStaked = stakedBalance ? Number(stakedBalance) / 1e18 : 0;
  const userSTokenBalance = sTokenBalance ? Number(sTokenBalance) / 1e18 : 0;
  const userRewards = totalRewards ? Number(totalRewards) / 1e18 : 0;

  const stakeData = {
    tokenSymbol,
    sTokenSymbol: `s${tokenSymbol}`,
    totalStaked: 0,
    apr30d: 0,
    totalRewards: userRewards,
    userStaked,
    userSTokenBalance,
    userRewards,
    cooldownEndsAt: cooldownEnd,
    userBalance,
  };

  const form = useForm<StakeFormValues>({
    resolver: zodResolver(stakeSchema),
    defaultValues: { amount: "" },
    mode: "onChange",
  });

  const amountValue = form.watch("amount");
  const numericAmount = parseFloat(amountValue) || 0;

  const cooldownActive = isCooldownActive;
  const cooldownLabel = cooldownActive && cooldownEnd
    ? `${Math.ceil((cooldownEnd - Date.now() / 1000) / 3600)}h`
    : "";

  function handleUseMax() {
    form.setValue("amount", userBalance.toString(), { shouldValidate: true });
  }

  async function onSubmit(data: StakeFormValues) {
    if (needsApproval) {
      approve();
    } else {
      stake(data.amount);
      form.reset();
    }
  }

  function handleUnstake() {
    if (cooldownActive || userStaked <= 0) return;
    unstake();
  }

  const fields: FieldItem[] = STAKE_FIELDS.map((field) => ({
    ...field,
    label: t("amountToStake"),
    ariaLabel: t("amountToStake"),
    endContent: <Avatar name={tokenSymbol} size="default" />,
    description: (
      <button
        type="button"
        onClick={handleUseMax}
        className="text-xs text-primary hover:underline"
      >
        {t("useMax", {
          amount: formatStakeNumber(userBalance),
          token: tokenSymbol,
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
    needsApproval,
    isApproving,
    isStaking,
    isUnstaking,
  };
}
