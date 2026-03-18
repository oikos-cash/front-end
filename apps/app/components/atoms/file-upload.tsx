"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import type { FileUploadProps } from "@/types/interfaces";

// Icons
import { Upload, X, ImageIcon } from "lucide-react";

export default function FileUpload({
  value,
  onChange,
  accept = "image/png,image/jpeg,image/svg+xml,image/webp",
  disabled,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange?.(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleRemove = () => {
    onChange?.("");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (value) {
    return (
      <div className={`flex items-center gap-3 ${className ?? ""}`}>
        <Image
          src={value}
          alt="Preview"
          width={64}
          height={64}
          className="rounded-lg border border-border object-cover"
        />
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      } ${disabled ? "pointer-events-none opacity-50" : ""} ${className ?? ""}`}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        {isDragging ? (
          <Upload className="size-5 text-primary" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">
          {isDragging ? "Drop here" : "Click or drag to upload"}
        </span>
        <span className="text-xs text-muted-foreground">
          PNG, JPG, SVG or WebP
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </button>
  );
}
