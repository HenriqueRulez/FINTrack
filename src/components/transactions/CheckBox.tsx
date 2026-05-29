"use client";

// ---------------------------------------------------------------------------
// CheckBox — custom checkbox with three states: off / on / mixed
// ---------------------------------------------------------------------------

interface CheckBoxProps {
  state: "off" | "on" | "mixed";
  onClick: () => void;
  label?: string;
}

export function CheckBox({ state, onClick, label }: CheckBoxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "mixed" ? "mixed" : state === "on"}
      aria-label={label}
      onClick={onClick}
      className={[
        "inline-grid place-items-center w-4 h-4 rounded-[3px] border cursor-pointer transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        state === "off"
          ? "border-border/70 bg-muted hover:border-primary"
          : "border-primary bg-primary",
      ].join(" ")}
      style={
        state !== "off"
          ? { boxShadow: "0 0 8px oklch(0.72 0.17 185 / 40%)" }
          : undefined
      }
    >
      {state === "on" && (
        <span
          aria-hidden="true"
          style={{
            display: "block",
            width: 4,
            height: 8,
            border: "2px solid var(--background)",
            borderTop: "none",
            borderLeft: "none",
            transform: "rotate(45deg) translate(-1px, -1px)",
          }}
        />
      )}
      {state === "mixed" && (
        <span
          aria-hidden="true"
          style={{
            display: "block",
            width: 8,
            height: 2,
            background: "var(--background)",
          }}
        />
      )}
    </button>
  );
}
