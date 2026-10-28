import { CalendarDays, Dumbbell, House, TrendingUp, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  const { pathname } = useLocation();
  const active = items.findIndex((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 md:max-w-3xl">
          <FormaLockup />
        </div>
      </header>
      <main className="pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <div key={pathname}>
          <Outlet />
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))]" aria-label="Principal">
        <div className="relative mx-auto flex max-w-lg items-stretch justify-between rounded-full border border-line/80 bg-surface/95 p-1 shadow-[0_12px_34px_rgba(18,32,51,0.12)] backdrop-blur md:max-w-3xl">
          {active >= 0 ? (
            <span
              className="absolute top-1 bottom-1 left-1 rounded-full bg-lime shadow-[0_6px_16px_rgba(29,78,216,0.35)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.25,1.15)]"
              style={{ width: `calc((100% - 0.5rem) / ${items.length})`, transform: `translateX(${active * 100}%)` }}
              aria-hidden
            />
          ) : null}
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative z-10 flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors duration-300",
                  isActive ? "text-white" : "text-faint active:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} strokeWidth={isActive ? 2.4 : 2} aria-hidden className={cn("transition-transform duration-300", isActive && "-translate-y-px scale-110")} />
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
    <div className="mx-auto max-w-lg px-4 pt-8" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-4 w-24 rounded-full" />
      <div className="skeleton mt-4 aspect-[3/2] rounded-[28px]" />
      <div className="skeleton mt-5 h-6 w-48 rounded-full" />
      <div className="mt-6 flex flex-col gap-3">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
      </div>
    </div>
  );
}
