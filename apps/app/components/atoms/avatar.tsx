import {
  Avatar as AvatarPrimitive,
  AvatarImage,
  AvatarFallback,
} from "@/components/atoms/ui/avatar";
import type { AvatarProps } from "@/types/interfaces";

export default function Avatar({
  name,
  src,
  size = "default",
  className,
}: AvatarProps) {
  return (
    <AvatarPrimitive size={size} className={className}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </AvatarPrimitive>
  );
}
