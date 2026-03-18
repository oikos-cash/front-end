"use client";
// Components
import {
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
  Select as Primitive,
} from "@/components/atoms/ui/select";

// Hooks
import { useRouter } from "next/navigation";

// Utils
import clsx from "clsx";

// Types
import { SelectProps } from "@/types/interfaces";

export default function Select({
  items,
  disabled,
  className,
  placeholder,
  value,
  defaultValue,
  onValueChange,
}: SelectProps) {
  const router = useRouter();

  // Methods
  const handleValueChange = (newValue: string) => {
    const item = items?.find((item) => item.value === newValue);
    if (item?.href) {
      router.push(item.href);
    } else if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <Primitive
      disabled={disabled}
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
    >
      <SelectTrigger
        className={clsx("w-full", disabled && "cursor-not-allowed", className)}
      >
        <SelectValue placeholder={placeholder || ""} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {placeholder && <SelectLabel>{placeholder}</SelectLabel>}
          {items?.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Primitive>
  );
}
