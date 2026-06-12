"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({
  variant = "outline",
}: {
  variant?: "outline" | "ghost";
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button variant={variant} onClick={signOut} className="gap-2 text-muted-foreground">
      <LogOut className="size-4" aria-hidden /> Sign out
    </Button>
  );
}
