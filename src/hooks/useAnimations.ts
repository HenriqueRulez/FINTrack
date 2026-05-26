"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fintrack_animations_enabled";

export function useAnimations() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default is true (animations ON)
    const isEnabled = stored === null ? true : stored === "true";
    setEnabled(isEnabled);

    if (isEnabled) {
      document.body.classList.add("animations-enabled");
    } else {
      document.body.classList.remove("animations-enabled");
    }
  }, []);

  return { enabled };
}
