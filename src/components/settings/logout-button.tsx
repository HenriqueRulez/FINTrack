"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setIsPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/passphrase");
    router.refresh();
  }

  return (
    <Button
      variant="destructive"
      size="default"
      disabled={isPending}
      aria-label="Terminar sessão"
      aria-busy={isPending}
      onClick={handleLogout}
      className="gap-2"
    >
      <LogOut className="size-4" aria-hidden="true" />
      {isPending ? "A terminar sessão…" : "Terminar sessão"}
    </Button>
  );
}
