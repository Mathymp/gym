import { CalendarDays, Dumbbell, House, TrendingUp, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { FormaLockup } from "@/components/forma-mark";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Inicio", icon: House, end: true },
  { to: "/entrenar", label: "Entreno", icon: Dumbbell, end: false },
  { to: "/progreso", label: "Progreso", icon: TrendingUp, end: false },
  { to: "/calendario", label: "Calendario", icon: CalendarDays, end: false },
  { to: "/perfil", label: "Perfil", icon: UserRound, end: false },
];

export function AppShell() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:max-w-3xl">
          <FormaLockup />
        </div>
      </header>
      <main className="pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-stretch justify-between rounded-full border border-line bg-surface px-1 py-1 shadow-[0_10px_30px_rgba(18,32,51,0.08)] md:max-w-3xl">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium",
                  isActive ? "bg-lime text-white" : "text-faint",
                )
              }
            >
              <item.icon size={18} strokeWidth={2} aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function ScreenSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-8">
      <div className="h-4 w-24 animate-pulse rounded-full bg-raised" />
      <div className="mt-4 h-28 animate-pulse rounded-[28px] bg-raised" />
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="h-16 animate-pulse rounded-2xl bg-raised" />
        <div className="h-16 animate-pulse rounded-2xl bg-raised" />
        <div className="h-16 animate-pulse rounded-2xl bg-raised" />
        <div className="h-16 animate-pulse rounded-2xl bg-raised" />
      </div>
    </div>
  );
}
