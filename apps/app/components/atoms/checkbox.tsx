// Components
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldDescription,
} from "@/components/atoms/ui/field";
import { Checkbox as Primitive } from "@/components/atoms/ui/checkbox";

// Types
import type { CheckboxProps } from "@/types/interfaces";

export default function Checkbox({
  id,
  label,
  disabled,
  description,
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
