"use client";

import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "bg-background border-border text-foreground shadow-lg rounded-lg",
          title: "text-sm font-medium",
          description: "text-xs text-muted-foreground",
          success: "border-l-4 border-l-green-500",
          error: "border-l-4 border-l-destructive",
          warning: "border-l-4 border-l-yellow-500",
          info: "border-l-4 border-l-primary",
        },
      }}
      visibleToasts={3}
      richColors
    />
  );
}
