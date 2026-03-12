import { Checkbox as Primitive } from "@/components/atoms/ui/checkbox";
import { CheckboxProps } from "@/types/interfaces";

export default function Checkbox({ ...props }: CheckboxProps) {
  return <Primitive {...props} />;
}
