// Components
import {
  EmptyMedia,
  EmptyTitle,
  EmptyHeader,
  EmptyContent,
  EmptyDescription,
} from "@/components/atoms/ui/empty";

// Utils
import { cn } from "@/utils/object";

// Types
import { EmptyProps } from "@/types/interfaces";

export default function Empty({
  icon,
  title,
  children,
  className,
  description,
  iconVariant = "default",
}: EmptyProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg p-4 text-center text-balance",
        className,
      )}
    >
      <EmptyHeader>
        {icon && <EmptyMedia variant={iconVariant}>{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </div>
  );
}
