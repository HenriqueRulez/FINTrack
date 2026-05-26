"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fintrack_animations_enabled";

export function AnimationsToggle() {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    const isEnabled = stored === null ? true : stored === "true";
    setEnabled(isEnabled);

    if (isEnabled) {
      document.body.classList.add("animations-enabled");
    } else {
      document.body.classList.remove("animations-enabled");
    }
  }, []);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));

    if (next) {
      document.body.classList.add("animations-enabled");
    } else {
      document.body.classList.remove("animations-enabled");
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Animações de entrada</p>
        <p className="text-xs text-muted-foreground mt-1">
          Efeitos fade-in e slide-up ao carregar o dashboard
        </p>
      </div>
      {/* Custom toggle — avoids extra shadcn/ui dependency */}
      <button
        role="switch"
        aria-checked={mounted ? enabled : true}
        aria-label="Activar animações de entrada"
        onClick={handleToggle}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          mounted && enabled ? "bg-primary" : "bg-muted",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg",
            "ring-0 transition duration-200 ease-in-out",
            mounted && enabled ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
