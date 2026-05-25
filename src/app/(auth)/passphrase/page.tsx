"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PassphrasePage() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: "owner@fintrack.local",
      password: passphrase,
    });

    if (error) {
      setError(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm bg-card rounded-xl p-8 neon-border-primary border">
        <h1 className="text-xl font-bold text-primary neon-primary-text mb-1 tracking-tight">
          FINTrack
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Digite a palavra-passe para continuar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Palavra-passe"
            autoFocus
            required
            className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all"
          />

          {error && (
            <p className="text-sm text-[var(--loss)]">Palavra-passe incorrecta.</p>
          )}

          <button
            type="submit"
            disabled={loading || !passphrase}
            className="w-full bg-primary hover:opacity-90 disabled:opacity-40 text-primary-foreground font-medium py-2 rounded-lg text-sm transition-all neon-primary"
          >
            {loading ? "A verificar..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
