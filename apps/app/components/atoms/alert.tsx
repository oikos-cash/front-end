import {
  AlertTitle,
  AlertDescription,
  Alert as Primitive,
} from "@/components/atoms/ui/alert";

// Types
import { AlertProps } from "@/types/interfaces";

export default function Alert({ title, description, variant }: AlertProps) {
  return (
    <Primitive variant={variant ?? "default"}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Primitive>
  );
}
