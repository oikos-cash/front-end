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
//                     BORROW
// =================================================

/**
 * Schema for the borrow form.
 * `borrowAmount` must be a non-empty string representing a positive number.
 * `duration` must be a non-empty string (selected from duration options).
 * Error messages are i18n keys resolved by the component via useTranslations.
 */
export const borrowSchema = z.object({
  borrowAmount: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive"
    ),
  duration: z.string().min(1, "errors.required"),
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

// =================================================
//                    LAUNCHPAD
// =================================================

/**
 * Schema for the launchpad token info form (Step 1).
 * `tokenName` and `tokenSymbol` are required.
 * Error messages are i18n keys resolved by the component via useTranslations.
 */
export const launchpadTokenSchema = z.object({
  tokenName: z.string().min(1, "errors.required"),
  tokenSymbol: z.string().min(1, "errors.required"),
  tokenDescription: z.string().optional(),
  enablePresale: z.string().min(1, "errors.required"),
  tokenLogoUrl: z.string().optional(),
});

/**
 * Schema for the launchpad pool setup form (Step 2).
 * `floorPrice` and `totalSupply` must be positive numbers.
 * Error messages are i18n keys resolved by the component via useTranslations.
 */
export const launchpadPoolSchema = z.object({
  floorPrice: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive"
    ),
  totalSupply: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive"
    ),
  reserveAsset: z.string().min(1, "errors.required"),
  protocol: z.string().min(1, "errors.required"),
});

/**
 * Schema for the launchpad presale form (Step 3).
 * `presaleDuration` must be selected, `softCapPercent` must be 20-60.
 * Error messages are i18n keys resolved by the component via useTranslations.
 */
export const launchpadPresaleSchema = z.object({
  presaleDuration: z.string().min(1, "errors.required"),
  softCapPercent: z.number().min(20).max(60),
});
