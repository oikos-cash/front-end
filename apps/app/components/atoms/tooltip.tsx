"use client";

// Components
import {
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Tooltip as Primitive,
} from "@/components/atoms/ui/tooltip";

// Types
import { TooltipProps } from "@/types/interfaces";

export default function Tooltip({
  children,
  content,
  side,
  sideOffset,
}: TooltipProps) {
  return (
    <TooltipProvider>
      <Primitive>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} sideOffset={sideOffset}>
          {content}
        </TooltipContent>
      </Primitive>
    </TooltipProvider>
  );
}
