import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ScreenSkeleton } from "@/components/shell";
import { Page } from "@/components/ui";
import { humanError } from "@/lib/errors";
import { useAuth } from "@/features/auth-context";
import { useProfile } from "@/features/use-data";

export function RequireUser() {
  const { session, ready } = useAuth();
  const profile = useProfile();
  const location = useLocation();
  if (!ready || (session && profile.isLoading)) return <ScreenSkeleton />;
  if (!session) return <Navigate to="/" replace />;
  if (profile.isError) {
    return (
      <Page>
        <h1 className="text-2xl font-semibold">No pudimos cargar tu archivo</h1>
        <p className="mt-2 text-sm text-muted">{humanError(profile.error)}</p>
        <button className="mt-4 h-11 text-sm font-semibold text-lime" onClick={() => void profile.refetch()}>
          Reintentar
        </button>
      </Page>
    );
  }
  const onboarded = Boolean(profile.data?.onboarding_completed);
  if (!onboarded && location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  if (onboarded && location.pathname === "/onboarding") return <Navigate to="/" replace />;
  return <Outlet />;
}
