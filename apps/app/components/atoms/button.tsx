import { Button as Primitive, ButtonProps } from "@/components/atoms/ui/button";

export default function Button({ children, ...props }: ButtonProps) {
  return <Primitive {...props}>{children}</Primitive>;
}
