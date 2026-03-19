// Components
import { Textarea as TextareaPrimitive } from "@/components/atoms/ui/textarea";

// Types
import type { TextareaProps } from "@/types/interfaces";

export default function Textarea({ className, ...props }: TextareaProps) {
  return <TextareaPrimitive className={className} {...props} />;
}
