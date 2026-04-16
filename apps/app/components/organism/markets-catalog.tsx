"use client";

// Components
import Empty from "@/components/atoms/empty";
import Input from "@/components/atoms/input";
import Button from "@/components/atoms/button";
import Select from "@/components/atoms/select";
import ButtonGroup from "@/components/atoms/button-group";
import TokenCard from "@/components/molecules/card/token";
import TokenCardSkeleton from "@/components/molecules/card/token-skeleton";

// Hooks
import { useTranslations } from "next-intl";
import { useMarketsCatalog } from "@/hooks/use-markets-catalog";

// Types
import type { FilterType, SortType } from "@/hooks/use-markets-catalog";
import type { MarketToken } from "@/types/interfaces";

// Icons
import { Search, SearchX, ServerOff } from "lucide-react";

export default function MarketsCatalog({
  initialTokens,
}: {
  initialTokens: MarketToken[];
}) {
  const t = useTranslations("markets");
  const te = useTranslations("error");

  const {
    hasData,
    search,
    filter,
    sort,
    setSearch,
    setFilter,
    setSort,
    processed,
    presaleTokens,
    graduatedTokens,
    showSections,
  } = useMarketsCatalog(initialTokens);

  const sortOptions = [
    { value: "default", label: t("sortDefault") },
    { value: "marketCap", label: t("sortMarketCap") },
    { value: "newest", label: t("sortNewest") },
    { value: "raised", label: t("sortRaised") },
  ];

  function renderGrid(items: MarketToken[]) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((token) => (
          <TokenCard key={token.id} token={token} />
        ))}
      </div>
    );
  }

  // No data from API
  if (!hasData) {
    return (
      <Empty
        className="py-16"
        title={te("noBackend")}
        description={te("noBackendDesc")}
        icon={<ServerOff className="size-6 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
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

      {processed.length > 0 ? (
        showSections ? (
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
        )
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
