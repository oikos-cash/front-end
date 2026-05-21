// Components
import Avatar from "@/components/atoms/avatar";

// Utils
import { cn } from "@/utils/object";

type AvatarSize = "sm" | "default" | "lg";

const RING_BY_SIZE: Record<AvatarSize, string> = {
  sm: "ring-2",
  default: "ring-2",
  lg: "ring-[3px]",
};

/**
 * Two overlapping token avatars — Uniswap-style pair icon. The base token
 * sits on top-left, the quote token tucks slightly behind on the bottom-right
 * with a ring matching the surrounding bg so the overlap reads cleanly.
 */
export default function TokenPair({
  base,
  quote,
  baseIcon,
  quoteIcon,
  size = "default",
  className,
}: {
  base: string;
  quote: string;
  baseIcon?: string;
  quoteIcon?: string;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center isolate",
        className,
      )}
      aria-label={`${base} / ${quote}`}
    >
      <Avatar
        name={base}
        src={baseIcon}
        size={size}
        className={cn(
          "relative z-10 ring-card",
          RING_BY_SIZE[size],
        )}
      />
      <Avatar
        name={quote}
        src={quoteIcon}
        size={size}
        className={cn(
          // Negative left margin tucks the second token underneath the first.
          "relative z-0 -ml-2.5 ring-card",
          RING_BY_SIZE[size],
        )}
      />
    </span>
  );
}
