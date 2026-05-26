"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  active: boolean; // false = placeholder (no page yet)
  icon: React.ReactNode;
}

function DashboardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="5.5" height="5.5" />
      <rect x="8.5" y="2" width="5.5" height="5.5" />
      <rect x="2" y="8.5" width="5.5" height="5.5" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" />
    </svg>
  );
}

function HoldingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2v6l5 3" />
    </svg>
  );
}

function TransactionsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M3 5h10l-3-3" />
      <path d="M13 11H3l3 3" />
    </svg>
  );
}

function PerformanceIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2 12l4-4 3 2 5-6" />
      <path d="M10 4h4v4" />
    </svg>
  );
}

function TaxIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="2" width="10" height="12" />
      <path d="M5 5h6M5 8h2M9 8h2M5 11h2M9 11h2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", active: true, icon: <DashboardIcon /> },
  { label: "Holdings", href: "/holdings", active: true, icon: <HoldingsIcon /> },
  { label: "Transactions", href: "#", active: false, icon: <TransactionsIcon /> },
  { label: "Performance", href: "#", active: false, icon: <PerformanceIcon /> },
  { label: "Tax Calculator", href: "#", active: false, icon: <TaxIcon /> },
];

const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
  active: true,
  icon: <SettingsIcon />,
};

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname();

  function renderNavItem(item: NavItem) {
    const isCurrent = item.active && (pathname === item.href || pathname.startsWith(item.href + "/"));

    if (!item.active) {
      // Placeholder — not a real page yet
      return (
        <a
          key={item.label}
          href="#"
          aria-disabled="true"
          tabIndex={-1}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm opacity-40 cursor-not-allowed pointer-events-none text-sidebar-foreground"
        >
          {item.icon}
          {item.label}
        </a>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href as never}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
          isCurrent
            ? "bg-sidebar-accent text-primary font-medium border-l-2 border-primary pl-[10px]"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
        aria-current={isCurrent ? "page" : undefined}
      >
        {item.icon}
        {item.label}
      </Link>
    );
  }

  const settingsCurrent =
    pathname === SETTINGS_ITEM.href ||
    pathname.startsWith(SETTINGS_ITEM.href + "/");

  return (
    <aside className="hidden md:flex w-[220px] bg-sidebar border-r border-sidebar-border/60 flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 pb-4 border-b border-sidebar-border/60">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-[4px] bg-primary text-primary-foreground font-bold text-[14px] shrink-0"
          style={{ boxShadow: "0 0 14px oklch(0.72 0.17 185 / 40%)" }}
          aria-hidden="true"
        >
          F
        </div>
        <div className="text-sm font-medium tracking-wide leading-none">
          <span className="text-foreground">FINTrack</span>{" "}
          <span className="text-muted-foreground">/ v0.1</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-4" aria-label="Navegação principal">
        {NAV_ITEMS.map(renderNavItem)}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings at bottom */}
      <nav className="px-3 py-4 border-t border-sidebar-border/60" aria-label="Configurações">
        <Link
          href={SETTINGS_ITEM.href as never}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            settingsCurrent
              ? "bg-sidebar-accent text-primary font-medium border-l-2 border-primary pl-[10px]"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
          aria-current={settingsCurrent ? "page" : undefined}
        >
          <SettingsIcon />
          {SETTINGS_ITEM.label}
        </Link>
      </nav>
    </aside>
  );
}
