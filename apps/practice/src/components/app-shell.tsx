import { redirect } from "next/navigation";
import { Button, Avatar, ThemeToggle } from "@dentalos/ui";
import { LogOut } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { getTenantContext } from "@/lib/tenant";
import { Sidebar } from "./sidebar";
import { logoutAction } from "@/app/login/actions";

/** Authenticated app chrome: sidebar + topbar. Used by each top-level section layout. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar clinicName={ctx.tenant.name} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-end gap-2 border-b border-border/60 bg-card/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <ThemeToggle />
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card py-1 pl-1 pr-3 shadow-sm">
            <Avatar name={session.name} className="h-7 w-7 text-xs" />
            <div className="leading-tight">
              <div className="text-xs font-semibold">{session.name}</div>
              <div className="text-[10px] capitalize text-muted-foreground">{session.role}</div>
            </div>
          </div>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
