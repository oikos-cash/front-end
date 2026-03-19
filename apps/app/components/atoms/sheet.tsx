"use client";

// Components
import {
  Sheet as Primitive,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/atoms/ui/sheet";
import Button from "@/components/atoms/button";

// Types
import type { SheetProps } from "@/types/interfaces";

export default function Sheet({
  title,
  description,
  children,
  content,
  footer,
  side = "right",
  open,
  onOpenChange,
  submitLabel,
  onSubmit,
  cancelLabel = "Cancel",
}: SheetProps) {
  return (
    <Primitive open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">{content}</div>
        <SheetFooter>
          {footer ?? (
            <div className="flex w-full items-center justify-end gap-2">
              <SheetClose asChild>
                <Button variant="outline">{cancelLabel}</Button>
              </SheetClose>
              {submitLabel && (
                <SheetClose asChild>
                  <Button onClick={onSubmit}>{submitLabel}</Button>
                </SheetClose>
              )}
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Primitive>
  );
}
