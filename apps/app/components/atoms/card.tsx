import {
  Card as CardPrimitive,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/atoms/ui/card";
import type { CardProps } from "@/types/interfaces";

export default function Card({
  title,
  description,
  action,
  header,
  footer,
  children,
  className,
}: CardProps) {
  const hasHeader = header || title || description || action;

  return (
    <CardPrimitive className={className}>
      {hasHeader && (
        <CardHeader>
          {header ?? (
            <>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
              {action && <CardAction>{action}</CardAction>}
            </>
          )}
        </CardHeader>
      )}
      {children && <CardContent>{children}</CardContent>}
      {footer && <CardFooter>{footer}</CardFooter>}
    </CardPrimitive>
  );
}
