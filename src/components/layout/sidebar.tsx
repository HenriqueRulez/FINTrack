"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Visão Geral", icon: "◉" },
  { href: "/portfolio", label: "Portfólio", icon: "◈" },
  { href: "/settings", label: "Configurações", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-5 border-b border-sidebar-border">
        <span className="text-lg font-bold text-primary neon-primary-text tracking-tight">
          FINTrack
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href as never}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
                isActive
                  ? "bg-sidebar-accent text-primary font-medium border-l-2 border-primary pl-[10px]"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
