import { Input as InputPrimitive } from "@/components/atoms/ui/input";
import type { InputProps } from "@/types/interfaces";

export default function Input({ className, startIcon, ...props }: InputProps) {
  if (startIcon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {startIcon}
        </span>
        <InputPrimitive className={`pl-10 ${className ?? ""}`} {...props} />
      </div>
    );
  }

  return <InputPrimitive className={className} {...props} />;
}
