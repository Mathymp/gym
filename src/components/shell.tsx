import { CalendarDays, Dumbbell, House, TrendingUp, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { consumeSyncNotice, flush, getSyncPhase, subscribeSync, type SyncPhase } from "@/lib/sync";

const items = [
  { to: "/", label: "Inicio", icon: House, end: true },
  { to: "/entrenar", label: "Entrenar", icon: Dumbbell, end: false },
  { to: "/progreso", label: "Progreso", icon: TrendingUp, end: false },
  { to: "/calendario", label: "Calendario", icon: CalendarDays, end: false },
  { to: "/perfil", label: "Perfil", icon: UserRound, end: false },
];

const syncCopy: Record<SyncPhase, string> = {
  local: "Guardado en el teléfono",
  syncing: "Sincronizando",
  synced: "Sincronizado",
  error: "Error de sincronización",
};

function useSyncPhase() {
  return useSyncExternalStore(subscribeSync, getSyncPhase, getSyncPhase);
}

export function AppShell() {
  const phase = useSyncPhase();
  useEffect(() => {
    const notice = consumeSyncNotice();
    if (notice) toast(notice);
  }, [phase]);

  return (
    <div className="min-h-dvh">
      <main className="pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1 pb-[env(safe-area-inset-bottom)] md:max-w-3xl">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn("flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-1 text-[11px]", isActive ? "text-lime" : "text-faint")
              }
            >
              <item.icon size={20} strokeWidth={1.75} aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </div>
        <button
          className={cn(
            "block w-full pb-1 text-center text-[11px]",
            phase === "error" ? "text-danger" : phase === "synced" ? "text-faint" : "text-lime",
          )}
          onClick={() => void flush()}
        >
          {syncCopy[phase]}
        </button>
      </nav>
    </div>
  );
}

export function ScreenSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-8">
      <div className="h-4 w-24 animate-pulse rounded bg-surface" />
      <div className="mt-4 h-10 w-48 animate-pulse rounded bg-surface" />
      <div className="mt-8 h-28 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
