"use client";

// Components
import {
  Tooltip as Primitive,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
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
