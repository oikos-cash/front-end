import { Input as InputPrimitive } from "@/components/atoms/ui/input";
import type { InputProps } from "@/types/interfaces";

export default function Input({ className, ...props }: InputProps) {
  return <InputPrimitive className={className} {...props} />;
}
