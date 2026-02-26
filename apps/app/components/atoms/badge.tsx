import { Badge as Primitive } from "@/components/atoms/ui/badge";
import { BadgeProps } from "@/types/interfaces";

export default function Badge({ children, ...props }: BadgeProps) {
  return <Primitive {...props}>{children}</Primitive>;
}
