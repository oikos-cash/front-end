export default async function StakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main>
      <h1>Stake - {token}</h1>
    </main>
  );
}
