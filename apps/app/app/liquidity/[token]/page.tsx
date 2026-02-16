export default async function LiquidityPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main>
      <h1>Liquidity - {token}</h1>
    </main>
  );
}
