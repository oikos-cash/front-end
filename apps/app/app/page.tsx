import Alert from "@/components/atoms/alert";
import Button from "@/components/atoms/button";

export default function Home() {
  return (
    <main>
      <Button variant="destructive">Hello World!</Button>
      <Alert title="Alert Title" description="This is an alert description." />
    </main>
  );
}
