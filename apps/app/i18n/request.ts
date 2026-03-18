import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = {
    ...(await import(`./messages/${locale}/home.json`)).default,
    ...(await import(`./messages/${locale}/markets.json`)).default,
    ...(await import(`./messages/${locale}/launchpad.json`)).default,
    ...(await import(`./messages/${locale}/liquidity.json`)).default,
    ...(await import(`./messages/${locale}/borrow.json`)).default,
    ...(await import(`./messages/${locale}/stake.json`)).default,
    ...(await import(`./messages/${locale}/header.json`)).default,
    ...(await import(`./messages/${locale}/footer.json`)).default,
    ...(await import(`./messages/${locale}/priceTable.json`)).default,
    ...(await import(`./messages/${locale}/wallet.json`)).default,
    ...(await import(`./messages/${locale}/tradesHistory.json`)).default,
    ...(await import(`./messages/${locale}/priceChart.json`)).default,
    ...(await import(`./messages/${locale}/trade.json`)).default,
    ...(await import(`./messages/${locale}/presale.json`)).default,
    ...(await import(`./messages/${locale}/dividends.json`)).default,
    ...(await import(`./messages/${locale}/studio.json`)).default,
  };

  return { locale, messages };
});
