// Components
import { ButtonGroup as Primitive } from "@/components/atoms/ui/button-group";

// Types
import { ButtonGroupProps } from "@/types/interfaces";

export default function ButtonGroup({
  children,
  className,
  orientation,
}: ButtonGroupProps) {
  return (
    <Primitive className={className} orientation={orientation}>
      {children}
    </Primitive>
  );
}
