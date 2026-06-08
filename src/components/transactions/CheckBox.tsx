"use client";

// ---------------------------------------------------------------------------
// CheckBox — custom checkbox with three states: off / on / mixed
//
// By default renders as an interactive <button role="checkbox">. When
// `interactive={false}` it renders as a visual-only <span>, so it can be
// nested inside another interactive element (e.g. the "Select All" button)
// without producing invalid HTML (<button> inside <button>).
// ---------------------------------------------------------------------------

interface CheckBoxProps {
  state: "off" | "on" | "mixed";
  onClick?: () => void;
  label?: string;
  /**
   * When false, renders a non-interactive visual element (<span>) instead of
   * a <button>. Use when the CheckBox lives inside another clickable element.
   * Defaults to true.
   */
  interactive?: boolean;
}

function CheckMark({ state }: { state: "off" | "on" | "mixed" }) {
  return (
    <>
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
    </>
  );
}

export function CheckBox({
  state,
  onClick,
  label,
  interactive = true,
}: CheckBoxProps) {
  const baseClass = [
    "inline-grid place-items-center w-4 h-4 rounded-[3px] border transition-colors flex-shrink-0",
    state === "off"
      ? "border-border/70 bg-muted hover:border-primary"
      : "border-primary bg-primary",
  ].join(" ");

  const glowStyle =
    state !== "off"
      ? { boxShadow: "0 0 8px oklch(0.72 0.17 185 / 40%)" }
      : undefined;

  if (!interactive) {
    return (
      <span aria-hidden="true" className={baseClass} style={glowStyle}>
        <CheckMark state={state} />
      </span>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "mixed" ? "mixed" : state === "on"}
      aria-label={label}
      onClick={onClick}
      className={[
        baseClass,
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      ].join(" ")}
      style={glowStyle}
    >
      <CheckMark state={state} />
    </button>
  );
}
