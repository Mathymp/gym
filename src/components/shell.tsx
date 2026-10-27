import { CalendarDays, Dumbbell, House, TrendingUp, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
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
      <main className="pb-28">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] md:max-w-3xl">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium",
                  isActive ? "text-lime" : "text-faint",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("flex h-8 w-12 items-center justify-center rounded-full", isActive ? "bg-raised text-lime" : "text-faint")}>
                    <item.icon size={20} strokeWidth={2} aria-hidden />
                  </span>
                  {item.label}
                </>
              )}
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
