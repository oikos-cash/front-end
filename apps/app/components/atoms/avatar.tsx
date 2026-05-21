import {
  Avatar as AvatarPrimitive,
  AvatarImage,
  AvatarFallback,
} from "@/components/atoms/ui/avatar";
import type { AvatarProps } from "@/types/interfaces";
import { getTokenIconUrl } from "@/lib/token-icons";
import { cn } from "@/utils/object";

export default function Avatar({
  name,
  src,
  size = "default",
  className,
}: AvatarProps) {
  const resolvedSrc = getTokenIconUrl(name, src);
  // The OKS asset (logo_dark.svg) has wide padding around the glyph and a
  // transparent background — scale it up and place it on a subtle dark disc
  // so it reads as a token icon rather than a faint hairline.
  const isOks = name?.toUpperCase() === "OKS";
  return (
    <AvatarPrimitive
      size={size}
      className={cn(
        isOks && "bg-[radial-gradient(circle_at_30%_20%,#1f2433,#0e1118)]",
        className,
      )}
    >
      {resolvedSrc && (
        <AvatarImage
          src={resolvedSrc}
          alt={name}
          className={cn(isOks && "scale-[1.55] object-contain")}
        />
      )}
      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </AvatarPrimitive>
  );
}
