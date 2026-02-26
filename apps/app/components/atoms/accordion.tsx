"use client";

import {
  Accordion as Primitive,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/atoms/ui/accordion";

// Types
import { AccordionProps } from "@/types/interfaces";

export default function Accordion({ type = "single", className, items }: AccordionProps) {
  return (
    <Primitive type={type} collapsible className={className}>
      {items.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.trigger}</AccordionTrigger>
          <AccordionContent>{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Primitive>
  );
}
