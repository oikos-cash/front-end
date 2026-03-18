import { Controller } from "react-hook-form";
import {
  Field as FieldPrimitive,
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldError,
} from "@/components/atoms/ui/field";
import type { FieldProps } from "@/types/interfaces";

export default function Field({
  name,
  control,
  label,
  description,
  children,
  className,
  orientation = "vertical",
  t,
}: FieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FieldPrimitive
          className={className}
          orientation={orientation}
          data-invalid={fieldState.invalid || undefined}
        >
          {orientation === "horizontal" ? (
            <>
              {typeof children === "function" ? children(field) : children}
              {(label || description) && (
                <FieldContent>
                  {label && (
                    <FieldLabel htmlFor={field.name} className="font-normal">
                      {label}
                    </FieldLabel>
                  )}
                  {description && (
                    <FieldDescription>{description}</FieldDescription>
                  )}
                </FieldContent>
              )}
            </>
          ) : (
            <>
              {label && <FieldLabel htmlFor={field.name}>{label}</FieldLabel>}
              {typeof children === "function" ? children(field) : children}
              {description && (
                <FieldDescription>{description}</FieldDescription>
              )}
            </>
          )}
          {fieldState.invalid && fieldState.error?.message && (
            <FieldError>
              {t ? t(fieldState.error.message) : fieldState.error.message}
            </FieldError>
          )}
        </FieldPrimitive>
      )}
    />
  );
}
