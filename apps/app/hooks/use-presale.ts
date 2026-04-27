import { useMemo } from "react";

// Hooks
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useWallet } from "@/stores/wallet";
import { usePresaleContract } from "@/hooks/use-presale-contract";

// Types
import type { VaultInfo } from "@/types/interfaces";

// Utils
import { formatCompactNumber } from "@/utils/number";

/**
 * Manages presale page state:
 * - Reads presale contract data on-chain
 * - Extracts user BNB balance from wallet
 * - Builds KPI and contribution row arrays
 */
export function usePresale(vault: VaultInfo | null) {
  const t = useTranslations("presale");
  const { isConnected, handleConnect, balances } = useWallet();
  const params = useParams();
  const token = (params.token as string)?.toUpperCase() ?? vault?.tokenSymbol ?? "TOKEN";

  const {
    presaleData: contractData,
    deposit,
    withdraw,
    isDepositing,
    isWithdrawing,
  } = usePresaleContract(vault?.presaleContract);

  const presaleData = {
    tokenSymbol: token,
    tokenName: vault?.tokenName ?? token,
    tokenLogoUrl: "",
    tokenDescription: "",
    price: contractData.initialPrice,
    hardCap: contractData.hardCap,
    softCap: contractData.softCap,
    raised: contractData.totalRaised,
    contributors: contractData.participants,
    userContribution: contractData.userContribution,
    userTokens: contractData.initialPrice > 0
      ? contractData.userContribution / contractData.initialPrice
      : 0,
    endsAt: contractData.deadline,
    softCapReached: contractData.isSoftCapReached,
    status: contractData.status,
    timeLeftSeconds: contractData.timeLeftSeconds,
    minContribution: 0.01,
    maxContribution: contractData.hardCap,
    isDeployer: false,
  };

  const userBalance = useMemo(() => {
    const bnb = balances.find((b) => b.token === "BNB");
    return bnb ? parseFloat(bnb.amount) : 0;
  }, [balances]);

  const kpiCards = [
    { key: "token", value: token },
    { key: "price", value: `${presaleData.price.toFixed(6)} BNB` },
    { key: "hardCap", value: `${presaleData.hardCap.toFixed(2)} BNB` },
    { key: "softCap", value: `${presaleData.softCap.toFixed(2)} BNB` },
  ];

  const contributionRows = presaleData.userContribution > 0
    ? [
        {
          key: "contributed",
          value: `${presaleData.userContribution.toFixed(4)} BNB`,
        },
        {
          key: "tokensToReceive",
          value: `${formatCompactNumber(presaleData.userTokens)} ${token}`,
        },
      ]
    : [];

  return {
    t,
    isConnected,
    handleConnect,
    presaleData,
    userBalance,
    kpiCards,
    contributionRows,
    deposit,
    withdraw,
    isDepositing,
    isWithdrawing,
  };
}
