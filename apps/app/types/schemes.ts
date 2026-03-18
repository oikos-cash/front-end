import { z } from "zod/v3";

// =================================================
//                     STAKING
// =================================================

/**
 * Schema for the stake form.
 * `amount` must be a non-empty string representing a positive number.
 * Error messages are i18n keys resolved by the component via useTranslations.
 */
export const stakeSchema = z.object({
  amount: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive"
    ),
});

// =================================================
//                      TRADE
// =================================================

/**
 * Schema for the trade form.
 * `amount` must be a positive number string.
 * `customSlippage` is optional, validated only when provided (0-50 range).
 * `useWbnb` and `approveMax` are boolean toggles.
 * Error messages are i18n keys resolved by the component via useTranslations.
 */
export const tradeSchema = z.object({
  amount: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive"
    ),
  customSlippage: z
    .string()
    .refine(
      (v: string) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 50),
      "errors.slippageRange"
    ),
  useWbnb: z.boolean(),
  approveMax: z.boolean(),
});
