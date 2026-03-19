// Icons
import { Loader2 } from "lucide-react";

// Components
import {
  Button as Primitive,
  type ButtonProps as PrimitiveProps,
} from "@/components/atoms/ui/button";

// Types
import type { ButtonAtomProps } from "@/types/interfaces";

export default function Button({
  children,
  isLoading,
  asChild,
  ...props
}: ButtonAtomProps) {
  if (asChild) {
    return (
      <Primitive {...props} asChild>
        {children}
      </Primitive>
    );
  }

  return (
    <Primitive {...props} disabled={props.disabled || isLoading}>
      {children}
      {isLoading && <Loader2 className="size-4 animate-spin" />}
    </Primitive>
  );
}

export type { PrimitiveProps as ButtonProps };
