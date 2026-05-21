"use client";

import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import type { Address } from "viem";
import { toast } from "sonner";

// Components
import Dialog from "@/components/atoms/dialog";
import Input from "@/components/atoms/input";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import KeyValueCard from "@/components/molecules/card/key-value";

// Hooks
import { useTranslations } from "next-intl";
import { useWallet } from "@/stores/wallet";

// ABIs
import { IWETH_ABI } from "@/lib/abis";

// Constants
import { WBNB_ADDRESS } from "@/types/constants";

// Utils
import { formatCompactNumber } from "@/utils/number";

type Mode = "wrap" | "unwrap";

export default function WrapUnwrapModal({
  open,
  onOpenChange,
  defaultMode = "wrap",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial direction when the modal opens. Useful when triggering from a
   *  context that already knows what the user wants to do (e.g. the wallet
   *  sidebar's WBNB row dispatches with defaultMode="unwrap"). */
  defaultMode?: Mode;
}) {
  const t = useTranslations("common");
  const { balances } = useWallet();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [amount, setAmount] = useState("");

  // Reset to the requested mode every time the modal opens so the caller's
  // intent always wins over the previously-selected tab.
  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setAmount("");
    }
  }, [open, defaultMode]);

  const numericAmount = parseFloat(amount) || 0;

  const bnbBalance = parseFloat(
    balances.find((b) => b.token === "BNB")?.amount ?? "0",
  );
  const wbnbBalance = parseFloat(
    balances.find((b) => b.token === "WBNB")?.amount ?? "0",
  );
  const maxAmount = mode === "wrap" ? bnbBalance : wbnbBalance;

  // Wrap: IWETH.deposit() payable
  const { writeContract: wrapWrite, data: wrapTxHash } = useWriteContract();
  const { isLoading: isWrapping, isSuccess: wrapSuccess } =
    useWaitForTransactionReceipt({ hash: wrapTxHash });

  // Unwrap: IWETH.withdraw(amount)
  const { writeContract: unwrapWrite, data: unwrapTxHash } = useWriteContract();
  const { isLoading: isUnwrapping, isSuccess: unwrapSuccess } =
    useWaitForTransactionReceipt({ hash: unwrapTxHash });

  const isPending = isWrapping || isUnwrapping;

  function handleUseMax() {
    setAmount(maxAmount.toString());
  }

  function handleSubmit() {
    if (numericAmount <= 0 || numericAmount > maxAmount) return;

    if (mode === "wrap") {
      wrapWrite(
        {
          address: WBNB_ADDRESS as Address,
          abi: IWETH_ABI,
          functionName: "deposit",
          value: parseEther(amount),
        },
        {
          onSuccess: () => toast.success(`Wrapped ${amount} BNB to WBNB`),
          onError: (err) => toast.error(err.message.split("\n")[0]),
        },
      );
    } else {
      unwrapWrite(
        {
          address: WBNB_ADDRESS as Address,
          abi: IWETH_ABI,
          functionName: "withdraw",
          args: [parseEther(amount)],
        },
        {
          onSuccess: () => toast.success(`Unwrapped ${amount} WBNB to BNB`),
          onError: (err) => toast.error(err.message.split("\n")[0]),
        },
      );
    }
  }

  if (wrapSuccess || unwrapSuccess) {
    setAmount("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "wrap" ? "Wrap BNB" : "Unwrap WBNB"}
      description={
        mode === "wrap"
          ? "Convert native BNB to WBNB (ERC-20)"
          : "Convert WBNB back to native BNB"
      }
      content={
        <div className="flex flex-col gap-4">
          <ButtonGroup className="w-full">
            <Button
              className="flex-1"
              variant={mode === "wrap" ? "default" : "outline"}
              size="sm"
              onClick={() => { setMode("wrap"); setAmount(""); }}
            >
              Wrap
            </Button>
            <Button
              className="flex-1"
              variant={mode === "unwrap" ? "default" : "outline"}
              size="sm"
              onClick={() => { setMode("unwrap"); setAmount(""); }}
            >
              Unwrap
            </Button>
          </ButtonGroup>

          <div className="flex flex-col gap-1">
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              type="button"
              onClick={handleUseMax}
              className="self-end text-xs text-primary hover:underline"
            >
              Max: {formatCompactNumber(maxAmount)}{" "}
              {mode === "wrap" ? "BNB" : "WBNB"}
            </button>
          </div>

          {numericAmount > 0 && (
            <KeyValueCard
              rows={[
                {
                  label: "You will receive",
                  value: `${formatCompactNumber(numericAmount)} ${mode === "wrap" ? "WBNB" : "BNB"}`,
                  variant: "success",
                },
              ]}
            />
          )}

          <Button
            className="w-full"
            disabled={numericAmount <= 0 || numericAmount > maxAmount || isPending}
            isLoading={isPending}
            onClick={handleSubmit}
          >
            {mode === "wrap" ? "Wrap BNB" : "Unwrap WBNB"}
          </Button>
        </div>
      }
    />
  );
}
