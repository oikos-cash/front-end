"use client";

import { useState } from "react";
import Image from "next/image";
import { TokenIconProps } from "@/types/interfaces";

export default function TokenIcon({
  token,
  iconUrl,
  size = 32,
}: TokenIconProps) {
  const [hasError, setHasError] = useState(false);

  if (iconUrl && !hasError) {
    return (
      <Image
        src={iconUrl}
        alt={token}
        width={size}
        height={size}
        className="rounded-full"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-muted text-xs font-semibold"
      style={{ width: size, height: size }}
    >
      {token.slice(0, 2).toUpperCase()}
    </div>
  );
}
