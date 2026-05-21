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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">FINTrack</h1>
        <p className="text-sm text-gray-500 mb-6">Digite a palavra-passe para continuar</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Palavra-passe"
            autoFocus
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error && (
            <p className="text-sm text-red-600">Palavra-passe incorrecta.</p>
          )}

          <button
            type="submit"
            disabled={loading || !passphrase}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? "A verificar..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
