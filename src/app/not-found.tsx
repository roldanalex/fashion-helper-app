import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl">Not in the wardrobe</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This page does not exist, or the piece it showed has been removed.
      </p>
      <Button asChild className="mt-6">
        <Link href="/today">Go to Today</Link>
      </Button>
    </main>
  );
}
