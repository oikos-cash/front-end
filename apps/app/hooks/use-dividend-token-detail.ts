import { useMemo, useState } from "react";

// Hooks
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useWallet } from "@/stores/wallet";

// Utils
import {
  generateMockDividendTokenDetail,
  formatCompactNumber,
} from "@/utils/number";
import { formatShortDate } from "@/utils/date";

/**
 * Manages dividend token detail page state:
 * - Resolves token from URL params
 * - Builds token info rows, KPI cards, and vesting grid cells from mock data
 * - Tranche pagination with prev/next navigation
 * - Mock withdraw handler
 */
export function useDividendTokenDetail() {
  const t = useTranslations("dividends");
  const { isConnected, handleConnect } = useWallet();
  const params = useParams();
  const tokenSymbol = (params.token as string)?.toUpperCase() ?? "OKS";

  const tokenDetail = useMemo(
    () => generateMockDividendTokenDetail(tokenSymbol),
    [tokenSymbol],
  );

  const [trancheIndex, setTrancheIndex] = useState(0);
  const [withdrawing, setWithdrawing] = useState(false);

  const entries = tokenDetail?.vestingEntries ?? [];
  const currentEntry = entries[trancheIndex];

  // Mock withdraw — will be replaced with contract call
  function handleWithdraw() {
    setWithdrawing(true);
    setTimeout(() => setWithdrawing(false), 2000);
  }

  // Token info rows shown inside the info Card — reuses the same data as KPIs
  const tokenInfoRows = tokenDetail
    ? [
        {
          key: "totalDistributed",
          value: `${formatCompactNumber(tokenDetail.totalDistributed)} ${tokenDetail.tokenSymbol}`,
        },
        {
          key: "unvestedLabel",
          value: `${tokenDetail.unvested.toFixed(4)} ${tokenDetail.tokenSymbol}`,
        },
        {
          key: "vestedLabel",
          value: `${tokenDetail.vested.toFixed(4)} ${tokenDetail.tokenSymbol}`,
        },
      ]
    : [];

  // KPI cards use the same keys but different value formatting
  const kpiCards = tokenDetail
    ? [
        {
          key: "totalDistributed",
          value: `${formatCompactNumber(tokenDetail.totalDistributed)} ${tokenDetail.tokenSymbol}`,
        },
        { key: "unvestedLabel", value: tokenDetail.unvested.toFixed(4) },
        { key: "vestedLabel", value: tokenDetail.vested.toFixed(4) },
      ]
    : [];

  // Vesting entry grid cells — grouped in pairs for the 2-column grid layout
  const vestingGridRows: { key: string; value: string; fontWeight?: string; className?: string }[][] = currentEntry
    ? [
        [
          { key: "lockedOn", value: formatShortDate(currentEntry.startDate) },
          {
            key: "fullyUnlocks",
            value: formatShortDate(currentEntry.unlockDate),
            className: currentEntry.isFullyUnlocked ? "text-primary" : "",
          },
        ],
        [
          {
            key: "totalLocked",
            value: currentEntry.amount.toFixed(4),
            fontWeight: "font-semibold",
          },
          {
            key: "alreadyClaimed",
            value: currentEntry.claimed.toFixed(4),
            fontWeight: "font-semibold",
            className: "text-muted-foreground",
          },
        ],
        [
          {
            key: "withdrawableNow",
            value: currentEntry.withdrawable.toFixed(4),
            fontWeight: "font-semibold",
            className: "text-primary",
          },
          {
            key: "stillLocked",
            value: currentEntry.stillLocked.toFixed(4),
            fontWeight: "font-semibold",
          },
        ],
      ]
    : [];

  return {
    t,
    isConnected,
    handleConnect,
    tokenDetail,
    entries,
    currentEntry,
    trancheIndex,
    setTrancheIndex,
    withdrawing,
    handleWithdraw,
    tokenInfoRows,
    kpiCards,
    vestingGridRows,
  };
}
