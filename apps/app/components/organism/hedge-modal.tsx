"use client";

import { useState } from "react";

// Components
import Dialog from "@/components/atoms/dialog";
import Badge from "@/components/atoms/badge";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import Empty from "@/components/atoms/empty";
import Skeleton from "@/components/atoms/skeleton";
import KeyValueCard from "@/components/molecules/card/key-value";

// Hooks
import { useTranslations } from "next-intl";
import { useHedge } from "@/hooks/use-hedge";

// Types
import type { HedgePosition } from "@/types/interfaces";

// Icons
import { Shield, Loader2 } from "lucide-react";

// Utils
import { formatCompactNumber } from "@/utils/number";
import { formatShortDate } from "@/utils/date";

type Tab = "create" | "positions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  pending: "secondary",
  closed: "outline",
  expired: "destructive",
  exercised: "default",
  failed: "destructive",
};

export default function HedgeModal({
  open,
  onOpenChange,
  vaultAddress,
  userAddress,
  loanAmountBNB,
  loanDurationDays,
  bnbPrice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultAddress: string;
  userAddress: string | null;
  loanAmountBNB: number;
  loanDurationDays: number;
  bnbPrice: number;
}) {
  const t = useTranslations("borrow");
  const [tab, setTab] = useState<Tab>("create");

  const {
    quote,
    quoteLoading,
    positions,
    activePositions,
    stats,
    createHedge,
    closeHedge,
    isCreating,
    isClosing,
  } = useHedge({
    userAddress,
    vaultAddress,
    loanAmountBNB,
    loanDurationDays,
    autoFetchQuote: open && tab === "create" && loanAmountBNB > 0,
    autoFetchPositions: open && !!userAddress,
  });

  const loanValueUsd = loanAmountBNB * bnbPrice;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Debt Hedge"
      description="Protect your loan against BNB price increases"
      content={
        <div className="flex flex-col gap-4">
          <ButtonGroup className="w-full">
            <Button
              className="flex-1"
              size="sm"
              variant={tab === "create" ? "default" : "outline"}
              onClick={() => setTab("create")}
            >
              Create Hedge
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant={tab === "positions" ? "default" : "outline"}
              onClick={() => setTab("positions")}
            >
              Positions ({activePositions.length})
            </Button>
          </ButtonGroup>

          {tab === "create" && (
            <CreateTab
              quote={quote}
              quoteLoading={quoteLoading}
              loanAmountBNB={loanAmountBNB}
              loanValueUsd={loanValueUsd}
              loanDurationDays={loanDurationDays}
              isCreating={isCreating}
              onCreate={createHedge}
            />
          )}

          {tab === "positions" && (
            <PositionsTab
              positions={positions}
              stats={stats}
              isClosing={isClosing}
              onClose={closeHedge}
            />
          )}
        </div>
      }
    />
  );
}

function CreateTab({
  quote,
  quoteLoading,
  loanAmountBNB,
  loanValueUsd,
  loanDurationDays,
  isCreating,
  onCreate,
}: {
  quote: any;
  quoteLoading: boolean;
  loanAmountBNB: number;
  loanValueUsd: number;
  loanDurationDays: number;
  isCreating: boolean;
  onCreate: () => Promise<any>;
}) {
  if (quoteLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <KeyValueCard
        rows={[
          { label: "Loan Amount", value: `${loanAmountBNB.toFixed(4)} BNB` },
          { label: "Loan Value", value: `$${formatCompactNumber(loanValueUsd)}` },
          { label: "Duration", value: `${loanDurationDays} days` },
        ]}
      />

      {quote && (
        <>
          <div className="flex flex-col gap-1 rounded-md border border-border p-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recommended Hedge
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm">CALL Option</span>
              <Badge variant="default">{quote.optionSymbol}</Badge>
            </div>
          </div>

          <KeyValueCard
            rows={[
              { label: "Strike Price", value: `$${quote.strikePrice.toFixed(2)}` },
              { label: "Premium", value: `$${quote.totalPremium.toFixed(2)} (${quote.premiumPercentage.toFixed(1)}%)` },
              { label: "Break-even", value: `$${quote.breakEvenPrice.toFixed(2)}` },
              { label: "Max Loss", value: `$${quote.maxLoss.toFixed(2)}`, variant: "destructive" as const },
              { label: "Max Profit", value: quote.maxProfit, variant: "success" as const },
            ]}
          />
        </>
      )}

      <Button
        className="w-full"
        disabled={!quote || isCreating}
        isLoading={isCreating}
        onClick={onCreate}
      >
        <Shield className="size-4" />
        Create Hedge
      </Button>
    </div>
  );
}

function PositionsTab({
  positions,
  stats,
  isClosing,
  onClose,
}: {
  positions: HedgePosition[];
  stats: any;
  isClosing: boolean;
  onClose: (hedgeId: string) => Promise<any>;
}) {
  if (positions.length === 0) {
    return (
      <Empty
        className="py-8"
        title="No hedge positions"
        description="Create a hedge to protect your loan."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {stats && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Active: {stats.active}</span>
          <span>P&L: ${stats.totalPnl?.toFixed(2) ?? "0.00"}</span>
        </div>
      )}

      {positions.map((pos) => (
        <div
          key={pos.id}
          className="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[pos.status] ?? "outline"}>
                {pos.status}
              </Badge>
              <span className="text-sm font-medium">
                CALL ${pos.strikePrice.toFixed(0)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatShortDate(new Date(pos.expiryDate * 1000))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1 text-xs">
            <span className="text-muted-foreground">Qty: {pos.quantity}</span>
            <span className="text-muted-foreground">
              Premium: ${pos.premium.toFixed(2)}
            </span>
            {pos.pnl !== null && (
              <span className={pos.pnl >= 0 ? "text-green-500" : "text-destructive"}>
                P&L: ${pos.pnl.toFixed(2)}
              </span>
            )}
          </div>

          {(pos.status === "active" || pos.status === "pending") && (
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              disabled={isClosing}
              isLoading={isClosing}
              onClick={() => onClose(pos.id)}
            >
              Close Position
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
