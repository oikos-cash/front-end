// Components
import {
  FieldError,
  FieldLabel,
  FieldContent,
  FieldDescription,
  Field as FieldPrimitive,
} from "@/components/atoms/ui/field";

// Hooks
import { Controller } from "react-hook-form";

// Types
import type { FieldProps } from "@/types/interfaces";

export default function Field({
  name,
  label,
  control,
  children,
  className,
  description,
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
