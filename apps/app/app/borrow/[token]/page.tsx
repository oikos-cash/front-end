export default async function BorrowPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main>
      <h1>Borrow - {token}</h1>
    </main>
  );
}
