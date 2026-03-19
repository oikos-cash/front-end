// Components
import { Slider as SliderPrimitive } from "@/components/atoms/ui/slider";

// Types
import type { SliderProps } from "@/types/interfaces";

export default function Slider({ className, ...props }: SliderProps) {
  return <SliderPrimitive className={className} {...props} />;
}
