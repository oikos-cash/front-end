"use client";

import ErrorTemplate from "@/components/templates/error";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorTemplate error={error} unstable_retry={unstable_retry} />;
}
