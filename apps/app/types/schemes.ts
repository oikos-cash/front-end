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
      "errors.mustBePositive",
    ),
});

// =================================================
//                      SWAP
// =================================================

/**
 * Schema for the swap form.
 * `fromToken` and `toToken` must be selected.
 * `fromAmount` must be a positive number string.
 * Error messages are i18n keys resolved by the component via useTranslations.
 */
export const swapSchema = z.object({
  fromToken: z.string().min(1, "errors.required"),
  toToken: z.string().min(1, "errors.required"),
  fromAmount: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive",
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
      "errors.mustBePositive",
    ),
  duration: z.string().min(1, "errors.required"),
});

// =================================================
//                   LOAN ACTIONS
// =================================================

/**
 * Schema for the repay form.
 * `repayAmount` must be a non-empty string representing a positive number.
 */
export const repaySchema = z.object({
  repayAmount: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive",
    ),
});

/**
 * Schema for the roll (extend) form.
 * `rollDuration` must be selected from available options.
 */
export const rollSchema = z.object({
  rollDuration: z.string().min(1, "errors.required"),
});

/**
 * Schema for the add collateral form.
 * `collateralAmount` must be a non-empty string representing a positive number.
 */
export const addCollateralSchema = z.object({
  collateralAmount: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive",
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
      "errors.mustBePositive",
    ),
  customSlippage: z
    .string()
    .refine(
      (v: string) =>
        v === "" || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 50),
      "errors.slippageRange",
    ),
  useWbnb: z.boolean(),
  approveMax: z.boolean(),
});

// =================================================
//                     PRESALE
// =================================================

/**
 * Schema for the presale contribution form.
 * `amount` must be a non-empty string representing a positive number.
 * Error messages are i18n keys resolved by the component via useTranslations.
 */
export const presaleContributionSchema = z.object({
  amount: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive",
    ),
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
  website: z.string().optional(),
  twitter: z.string().optional(),
  discord: z.string().optional(),
  telegram: z.string().optional(),
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
      "errors.mustBePositive",
    ),
  totalSupply: z
    .string()
    .min(1, "errors.required")
    .refine(
      (v: string) => !isNaN(Number(v)) && Number(v) > 0,
      "errors.mustBePositive",
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
