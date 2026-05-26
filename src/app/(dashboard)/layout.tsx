import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-screen bg-background relative">
      {/* Terminal grid background */}
      <div className="terminal-grid" aria-hidden="true" />

      <Sidebar />

      {/* Main column */}
      <div className="flex flex-col min-h-screen relative z-[1]">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
