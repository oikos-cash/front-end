"use client";

import { SWRConfig } from "swr";

import { swrFetcher } from "@/utils/fetcher";
import {
  SWR_DEDUPE_INTERVAL,
  SWR_ERROR_RETRY_COUNT,
  SWR_ERROR_RETRY_INTERVAL,
} from "@/types/constants";

export default function SWRProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: SWR_DEDUPE_INTERVAL,
        errorRetryCount: SWR_ERROR_RETRY_COUNT,
        errorRetryInterval: SWR_ERROR_RETRY_INTERVAL,
      }}
    >
      {children}
    </SWRConfig>
  );
}
