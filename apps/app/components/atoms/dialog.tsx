"use client";

import {
  Dialog as Primitive,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/atoms/ui/dialog";

import type { DialogProps } from "@/types/interfaces";

export default function Dialog({
  title,
  description,
  children,
  content,
  footer,
  open,
  onOpenChange,
  className,
}: DialogProps) {
  return (
    <Primitive open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className={className}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {content}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Primitive>
  );
}
