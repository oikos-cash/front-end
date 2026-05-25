"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "creator" | "trader";

interface OnboardingState {
  /**
   * Selected role, or `null` when the user has never picked one. Persisted
   * across sessions so the chooser doesn't keep popping up.
   */
  role: UserRole | null;
  /**
   * `true` when the user explicitly dismissed the chooser ("Skip for now").
   * Treated as a soft no — the modal stays closed until cleared, but the
   * UI can still nudge them via a reminder banner later.
   */
  skipped: boolean;
  setRole: (role: UserRole) => void;
  skip: () => void;
  reset: () => void;
}

/**
 * Persisted onboarding state — shared by `RoleSelectorModal` and any
 * future onboarding affordances (tour overlay, reminder banner, etc.).
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      role: null,
      skipped: false,
      setRole: (role) => set({ role, skipped: false }),
      skip: () => set({ skipped: true }),
      reset: () => set({ role: null, skipped: false }),
    }),
    {
      name: "oikos:onboarding",
      version: 1,
    },
  ),
);

/**
 * Convenience derived: should the role-selector modal pop on connect?
 * The wallet must be connected, the user must not have chosen yet, and
 * they must not have explicitly skipped.
 */
export function shouldShowRoleSelector(
  isConnected: boolean,
  state: Pick<OnboardingState, "role" | "skipped">,
): boolean {
  return isConnected && state.role === null && !state.skipped;
}
