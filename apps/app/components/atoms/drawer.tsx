"use client";

import { useCallback, useState } from "react";

// Components
import {
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
  DrawerContent,
  DrawerDescription,
  Drawer as Primitive,
} from "@/components/atoms/ui/drawer";
import Button from "@/components/atoms/button";

// Types
import { DrawerProps } from "@/types/interfaces";

export default function Drawer({
  title,
  close,
  footer,
  content,
  children,
  direction,
  description,
}: DrawerProps) {
  const [open, setOpen] = useState(false);

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("a")) setOpen(false);
    },
    [],
  );

  return (
    <Primitive direction={direction} open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent onClick={handleContentClick}>
        <div className="mx-auto w-full">
          <DrawerHeader>
            <div className="flex items-center justify-between gap-6">
              <DrawerTitle>{title}</DrawerTitle>
              {close && <DrawerClose asChild>{close}</DrawerClose>}
            </div>
            {description && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
          </DrawerHeader>
          {content && <div className="p-4 pt-0">{content}</div>}
          {footer && (
            <DrawerFooter>
              <Button>Submit</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          )}
        </div>
      </DrawerContent>
    </Primitive>
  );
}
