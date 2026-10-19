import { logoutAdmin } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck } from "lucide-react";

interface AdminHeaderProps {
  userEmail: string;
}

export function AdminHeader({ userEmail }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900 dark:text-slate-50">
              Panel Pengelola
            </span>
            <span className="rounded-sm bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              Administrator
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-xs text-slate-500 sm:inline-block dark:text-slate-400">
            {userEmail}
          </span>
          <form action={logoutAdmin}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-slate-700 hover:bg-destructive/10 hover:text-destructive dark:text-slate-300 dark:hover:bg-destructive/20"
            >
              <LogOut className="size-3.5" />
              Keluar
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

