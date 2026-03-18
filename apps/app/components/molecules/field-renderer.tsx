"use client";

// Components
import Field from "@/components/atoms/field";
import Input from "@/components/atoms/input";
import Select from "@/components/atoms/select";
import Checkbox from "@/components/atoms/checkbox";
import Textarea from "@/components/atoms/textarea";

// Types
import type { ControllerRenderProps, FieldValues } from "react-hook-form";
import type {
  FieldItem,
  InputFieldItem,
  SelectFieldItem,
  CheckboxFieldItem,
  TextareaFieldItem,
  FieldRendererProps,
} from "@/types/interfaces";

type FieldControl = ControllerRenderProps<FieldValues, string>;

function renderInput(item: InputFieldItem, field: FieldControl) {
  const input = (
    <Input
      {...field}
      min={item.min}
      max={item.max}
      id={field.name}
      type={item.type}
      step={item.step}
      pattern={item.pattern}
      disabled={item.disabled}
      readOnly={item.readOnly}
      aria-label={item.ariaLabel}
      placeholder={item.placeholder}
      autoComplete={item.autoComplete}
      className={item.inputClassName}
    />
  );

  if (item.endContent) {
    return (
      <div className="flex items-center gap-2">
        {input}
        {item.endContent}
      </div>
    );
  }

  return input;
}

function renderSelect(item: SelectFieldItem, field: FieldControl) {
  return (
    <Select
      items={item.items}
      placeholder={item.placeholder}
      defaultValue={item.defaultValue}
      disabled={item.disabled}
      onValueChange={field.onChange}
    />
  );
}

function renderCheckbox(item: CheckboxFieldItem, field: FieldControl) {
  return (
    <Checkbox
      id={field.name}
      checked={field.value}
      onCheckedChange={field.onChange}
      disabled={item.disabled}
      label={item.label}
      description={typeof item.description === "string" ? item.description : undefined}
    />
  );
}

function renderTextarea(item: TextareaFieldItem, field: FieldControl) {
  return (
    <Textarea
      {...field}
      id={field.name}
      rows={item.rows}
      maxLength={item.maxLength}
      placeholder={item.placeholder}
      disabled={item.disabled}
      aria-label={item.ariaLabel}
      className={item.textareaClassName}
    />
  );
}

function renderField(item: FieldItem, field: FieldControl) {
  switch (item.type) {
    case "text":
    case "number":
    case "email":
    case "tel":
    case "password":
    case "url":
    case "search":
      return renderInput(item, field);
    case "select":
      return renderSelect(item, field);
    case "checkbox":
      return renderCheckbox(item, field);
    case "textarea":
      return renderTextarea(item, field);
  }
}

export default function FieldRenderer({
  t,
  fields,
  control,
}: FieldRendererProps) {
  return (
    <>
      {fields.map((item) => {
        const isCheckbox = item.type === "checkbox";
        return (
          <Field
            key={item.name}
            name={item.name}
            control={control}
            label={isCheckbox ? undefined : item.label}
            className={item.className}
            description={isCheckbox ? undefined : item.description}
            orientation="vertical"
            t={t}
          >
            {(field) => renderField(item, field)}
          </Field>
        );
      })}
    </>
  );
}
