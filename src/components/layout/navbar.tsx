"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-end px-6">
      <button
        onClick={handleLogout}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Sair
      </button>
    </header>
  );
}
