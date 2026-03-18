"use client";

import { useMemo, useState } from "react";

// Components
import Card from "@/components/atoms/card";
import Empty from "@/components/atoms/empty";
import AvatarInfo from "@/components/molecules/avatar-info";
import Button from "@/components/atoms/button";

// Hooks
import { useTranslations } from "next-intl";

// Types
import type { DividendToken } from "@/types/interfaces";

// Utils
import {
  formatCompactNumber,
  generateMockDividendTokens,
} from "@/utils/number";

// Icons
import { Coins, Lock, ArrowDownToLine } from "lucide-react";

export default function DividendTokenList() {
  const t = useTranslations("dividends");
  const tokens = useMemo(() => generateMockDividendTokens(), []);

  const [lockingMap, setLockingMap] = useState<Record<string, boolean>>({});
  const [withdrawingMap, setWithdrawingMap] = useState<Record<string, boolean>>(
    {},
  );
  const [lockingAll, setLockingAll] = useState(false);
  const [withdrawingAll, setWithdrawingAll] = useState(false);

  const hasUnvested = tokens.some((tk) => tk.unvested > 0);
  const hasVested = tokens.some((tk) => tk.vested > 0);

  function handleLock(address: string) {
    setLockingMap((prev) => ({ ...prev, [address]: true }));
    setTimeout(() => {
      setLockingMap((prev) => ({ ...prev, [address]: false }));
    }, 2000);
  }

  function handleWithdraw(address: string) {
    setWithdrawingMap((prev) => ({ ...prev, [address]: true }));
    setTimeout(() => {
      setWithdrawingMap((prev) => ({ ...prev, [address]: false }));
    }, 2000);
  }

  function handleLockAll() {
    setLockingAll(true);
    setTimeout(() => setLockingAll(false), 2000);
  }

  function handleWithdrawAll() {
    setWithdrawingAll(true);
    setTimeout(() => setWithdrawingAll(false), 2000);
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <Empty
          className="py-12"
          title={t("noDividends")}
          description={t("noDividendsDesc")}
          icon={<Coins className="size-6 text-muted-foreground" />}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {hasUnvested && (
          <Button
            variant="outline"
            size="sm"
            isLoading={lockingAll}
            onClick={handleLockAll}
          >
            <Lock className="size-3.5" />
            {t("lockAll")}
          </Button>
        )}
        {hasVested && (
          <Button
            variant="outline"
            size="sm"
            isLoading={withdrawingAll}
            onClick={handleWithdrawAll}
          >
            <ArrowDownToLine className="size-3.5" />
            {t("withdrawAll")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tokens.map((token) => (
          <DividendTokenCard
            token={token}
            key={token.tokenAddress}
            onLock={() => handleLock(token.tokenAddress)}
            isLocking={lockingMap[token.tokenAddress] ?? false}
            onWithdraw={() => handleWithdraw(token.tokenAddress)}
            isWithdrawing={withdrawingMap[token.tokenAddress] ?? false}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function DividendTokenCard({
  token,
  isLocking,
  isWithdrawing,
  onLock,
  onWithdraw,
  t,
}: {
  token: DividendToken;
  isLocking: boolean;
  isWithdrawing: boolean;
  onLock: () => void;
  onWithdraw: () => void;
  t: (key: string) => string;
}) {
  return (
    <Card
      header={
        <AvatarInfo title={token.tokenName} subtitle={token.tokenSymbol} />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("totalDistributed")}
          </span>
          <span className="text-sm font-medium">
            {formatCompactNumber(token.totalDistributed)} {token.tokenSymbol}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("unvestedLabel")}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {token.unvested.toFixed(4)}
            </span>
            <Button
              variant="default"
              size="xs"
              disabled={token.unvested <= 0}
              isLoading={isLocking}
              onClick={onLock}
            >
              <Lock className="size-3" />
              {t("lockButton")}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("vestedLabel")}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {token.vested.toFixed(4)}
            </span>
            <Button
              variant="secondary"
              size="xs"
              disabled={token.vested <= 0}
              isLoading={isWithdrawing}
              onClick={onWithdraw}
            >
              <ArrowDownToLine className="size-3" />
              {t("withdrawButton")}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
