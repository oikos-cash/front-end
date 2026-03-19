"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Components
import Input from "@/components/atoms/input";
import Button from "@/components/atoms/button";
import ButtonGroup from "@/components/atoms/button-group";
import Select from "@/components/atoms/select";
import Empty from "@/components/atoms/empty";
import TokenCard from "@/components/molecules/token-card";
import TokenCardSkeleton from "@/components/molecules/token-card-skeleton";

// Hooks
import { useTranslations } from "next-intl";

// Icons
import { Loader2, Search, SearchX } from "lucide-react";

// Types
import type { MarketToken } from "@/types/interfaces";

// Utils
import { generateMockMarketTokens } from "@/utils/number";

// Constants
import { MARKETS_PAGE_SIZE, MARKETS_MAX_TOKENS } from "@/types/constants";

type FilterType = "all" | "presale" | "graduated";
type SortType = "default" | "marketCap" | "newest" | "raised";

export default function MarketsCatalog() {
  const t = useTranslations("markets");

  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("default");
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const sortOptions = [
    { value: "default", label: t("sortDefault") },
    { value: "marketCap", label: t("sortMarketCap") },
    { value: "newest", label: t("sortNewest") },
    { value: "raised", label: t("sortRaised") },
  ];

  // Filter + sort tokens
  const processed = useMemo(() => {
    let result = tokens;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (tk) =>
          tk.name.toLowerCase().includes(q) ||
          tk.symbol.toLowerCase().includes(q) ||
          tk.description.toLowerCase().includes(q),
      );
    }

    if (filter === "presale") {
      result = result.filter((tk) => tk.isPresale);
    } else if (filter === "graduated") {
      result = result.filter((tk) => tk.status === "graduated");
    }

    if (sort === "marketCap") {
      result = [...result].sort(
        (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0),
      );
    } else if (sort === "newest") {
      result = [...result].sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
      );
    } else if (sort === "raised") {
      result = [...result].sort((a, b) => (b.raised ?? 0) - (a.raised ?? 0));
    }

    return result;
  }, [tokens, search, filter, sort]);

  // Split into sections
  const presaleTokens = useMemo(
    () => processed.filter((tk) => tk.isPresale),
    [processed],
  );
  const graduatedTokens = useMemo(
    () => processed.filter((tk) => tk.status === "graduated"),
    [processed],
  );
  const showSections = filter === "all" && !search.trim() && sort === "default";

  // Load tokens
  const loadTokens = useCallback(
    (reset?: boolean) => {
      setIsLoading(true);
      const currentLength = reset ? 0 : tokens.length;
      const remaining = MARKETS_MAX_TOKENS - currentLength;

      if (remaining <= 0) {
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const count = Math.min(MARKETS_PAGE_SIZE, remaining);
      setTimeout(() => {
        const newTokens = generateMockMarketTokens(count, currentLength);
        setTokens((prev) => (reset ? newTokens : [...prev, ...newTokens]));
        setHasMore(currentLength + count < MARKETS_MAX_TOKENS);
        setIsLoading(false);
      }, 300);
    },
    [tokens.length],
  );

  useEffect(() => {
    loadTokens(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasMore &&
          !isLoading &&
          !search.trim()
        ) {
          loadTokens();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadTokens, search]);

  function renderGrid(items: MarketToken[]) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((token) => (
          <TokenCard key={token.id} token={token} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search + Filters + Sort */}
      <div className="sticky top-13 z-30 -mx-4 flex flex-col gap-3 border-b bg-background px-4 py-4">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          startIcon={<Search className="size-4" />}
        />

        <div className="flex items-center justify-between gap-3">
          <ButtonGroup>
            {(["all", "presale", "graduated"] as FilterType[]).map((f) => (
              <Button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                variant={filter === f ? "default" : "outline"}
              >
                {t(`filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
              </Button>
            ))}
          </ButtonGroup>

          <Select
            className="w-36"
            value={sort}
            defaultValue="default"
            onValueChange={(v) => setSort(v as SortType)}
            items={sortOptions}
          />
        </div>
      </div>

      {/* Content */}
      {tokens.length === 0 && isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <TokenCardSkeleton count={8} />
        </div>
      ) : processed.length > 0 ? (
        <>
          {showSections ? (
            <div className="flex flex-col gap-6">
              {presaleTokens.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">
                    {t("sectionPresales")}
                  </h2>
                  {renderGrid(presaleTokens)}
                </div>
              )}

              {graduatedTokens.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">
                    {t("sectionGraduated")}
                  </h2>
                  {renderGrid(graduatedTokens)}
                </div>
              )}
            </div>
          ) : (
            renderGrid(processed)
          )}

          <div ref={sentinelRef} className="h-1" />
          {isLoading && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      ) : (
        <Empty
          className="py-16"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          icon={<SearchX className="size-6 text-muted-foreground" />}
        />
      )}
    </div>
  );
}
