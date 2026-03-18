import { Checkbox as Primitive } from "@/components/atoms/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
} from "@/components/atoms/ui/field";
import type { CheckboxProps } from "@/types/interfaces";

export default function Checkbox({
  label,
  description,
  id,
  disabled,
  ...props
}: CheckboxProps) {
  if (!label && !description) {
    return <Primitive id={id} disabled={disabled} {...props} />;
  }

  return (
    <Field orientation="horizontal" data-disabled={disabled || undefined}>
      <Primitive id={id} disabled={disabled} {...props} />
      {description ? (
        <FieldContent>
          <FieldLabel htmlFor={id} className="font-normal">
            {label}
          </FieldLabel>
          <FieldDescription>{description}</FieldDescription>
        </FieldContent>
      ) : (
        <FieldLabel htmlFor={id} className="font-normal">
          {label}
        </FieldLabel>
      )}
    </Field>
  );
}
