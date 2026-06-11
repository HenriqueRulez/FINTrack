"use client";

// Sidebar do sandbox Fable 5 — cópia adaptada de src/components/layout/sidebar.tsx
// (mesmos estilos/active state do raiz), com os links do sandbox.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const BASE = "/projeto-fable-5";

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="2" width="5.5" height="5.5" />
      <rect x="8.5" y="2" width="5.5" height="5.5" />
      <rect x="2" y="8.5" width="5.5" height="5.5" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" />
    </svg>
  );
}

function HoldingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2v6l5 3" />
    </svg>
  );
}

function TransactionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 5h10l-3-3" />
      <path d="M13 11H3l3 3" />
    </svg>
  );
}

function PerformanceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 12l4-4 3 2 5-6" />
      <path d="M10 4h4v4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" />
    </svg>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: BASE, icon: <DashboardIcon /> },
  { label: "Holdings", href: `${BASE}/holdings`, icon: <HoldingsIcon /> },
  { label: "Transactions", href: `${BASE}/transactions`, icon: <TransactionsIcon /> },
  { label: "Performance", href: `${BASE}/performance`, icon: <PerformanceIcon /> },
];

const SETTINGS_HREF = `${BASE}/settings`;

export function F5Sidebar({ txCount }: { txCount: number }) {
  const pathname = usePathname();

  function isCurrent(href: string): boolean {
    if (href === BASE) return pathname === BASE;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function linkClass(current: boolean): string {
    return cn(
      "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
      current
        ? "bg-sidebar-accent text-primary font-medium border-l-2 border-primary pl-[10px]"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
    );
  }

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
          <span className="text-primary">/ FABLE-5</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-4" aria-label="Navegação Fable 5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={linkClass(isCurrent(item.href))}
            aria-current={isCurrent(item.href) ? "page" : undefined}
          >
            {item.icon}
            {item.label}
            {item.label === "Transactions" && (
              <span className="ml-auto text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm tabular-nums border border-border/50">
                {txCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Badge sandbox + Settings no rodapé */}
      <div className="px-6 pb-2">
        <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          sandbox
        </span>
      </div>
      <nav className="px-3 pb-4 pt-2 border-t border-sidebar-border/60" aria-label="Configurações">
        <Link
          href={SETTINGS_HREF}
          className={linkClass(isCurrent(SETTINGS_HREF))}
          aria-current={isCurrent(SETTINGS_HREF) ? "page" : undefined}
        >
          <SettingsIcon />
          Settings
        </Link>
      </nav>
    </aside>
  );
}
