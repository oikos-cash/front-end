import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Accordion as Primitive,
} from "@/components/atoms/ui/accordion";

// Types
import { AccordionProps } from "@/types/interfaces";

export default function Accordion({
  items,
  className,
  type = "single",
}: AccordionProps) {
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
