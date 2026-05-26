"use client";

// ---------------------------------------------------------------------------
// ShowSoldToggle — manual toggle, mirrors AnimationsToggle pattern
// ---------------------------------------------------------------------------

interface ShowSoldToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export function ShowSoldToggle({ value, onChange }: ShowSoldToggleProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm text-muted-foreground select-none">
        Show sold
      </span>
      <button
        role="switch"
        aria-checked={value}
        aria-label="Mostrar posições fechadas"
        onClick={() => onChange(!value)}
        className={[
          "relative inline-flex w-8 h-[18px] shrink-0 cursor-pointer rounded-full border transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          value
            ? "bg-primary/20 border-primary"
            : "bg-muted border-border",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute top-[2px] left-[2px] w-3 h-3 rounded-full transition-transform duration-150",
            value ? "translate-x-[14px] bg-primary" : "translate-x-0 bg-muted-foreground",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
