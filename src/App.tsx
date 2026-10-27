import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { registerSW } from "virtual:pwa-register";
import { AppShell, ScreenSkeleton } from "@/components/shell";
import { supabaseEnv } from "@/lib/env";
import { AuthProvider } from "@/features/auth-context";
import { AuthScreen, RequireUser, SetupScreen } from "@/features/auth";

const HomeScreen = lazy(() => import("@/features/home").then((module) => ({ default: module.HomeScreen })));
const OnboardingScreen = lazy(() => import("@/features/onboarding").then((module) => ({ default: module.OnboardingScreen })));
const CalendarScreen = lazy(() => import("@/features/calendar").then((module) => ({ default: module.CalendarScreen })));
const ProfileScreen = lazy(() => import("@/features/profile").then((module) => ({ default: module.ProfileScreen })));
const SessionScreen = lazy(() => import("@/features/session").then((module) => ({ default: module.SessionScreen })));
const TrainScreen = lazy(() => import("@/features/train").then((module) => ({ default: module.TrainScreen })));
const PlanEditorScreen = lazy(() => import("@/features/train").then((module) => ({ default: module.PlanEditorScreen })));
const LibraryScreen = lazy(() => import("@/features/train").then((module) => ({ default: module.LibraryScreen })));
const ProgressScreen = lazy(() => import("@/features/progress").then((module) => ({ default: module.ProgressScreen })));
const WeightScreen = lazy(() => import("@/features/progress").then((module) => ({ default: module.WeightScreen })));
const MeasuresScreen = lazy(() => import("@/features/progress").then((module) => ({ default: module.MeasuresScreen })));
const PhotosScreen = lazy(() => import("@/features/progress").then((module) => ({ default: module.PhotosScreen })));
const StrengthScreen = lazy(() => import("@/features/progress").then((module) => ({ default: module.StrengthScreen })));
const StrengthDetailScreen = lazy(() => import("@/features/progress").then((module) => ({ default: module.StrengthDetailScreen })));
const HistoryScreen = lazy(() => import("@/features/progress").then((module) => ({ default: module.HistoryScreen })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5_000 },
  },
});

export function App() {
  useEffect(() => {
    if (supabaseEnv.configured) registerSW({ immediate: true });
  }, []);

  if (!supabaseEnv.configured) return <SetupScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<ScreenSkeleton />}>
          <Routes>
            <Route path="/ingresar" element={<AuthScreen mode="login" />} />
            <Route path="/crear-cuenta" element={<AuthScreen mode="register" />} />
            <Route element={<RequireUser />}>
              <Route path="/onboarding" element={<OnboardingScreen />} />
              <Route element={<AppShell />}>
                <Route index element={<HomeScreen />} />
                <Route path="entrenar" element={<TrainScreen />} />
                <Route path="entrenar/rutina/:planId" element={<PlanEditorScreen />} />
                <Route path="entrenar/ejercicios" element={<LibraryScreen />} />
                <Route path="progreso" element={<ProgressScreen />} />
                <Route path="progreso/peso" element={<WeightScreen />} />
                <Route path="progreso/medidas" element={<MeasuresScreen />} />
                <Route path="progreso/fotos" element={<PhotosScreen />} />
                <Route path="progreso/fuerza" element={<StrengthScreen />} />
                <Route path="progreso/fuerza/:exerciseId" element={<StrengthDetailScreen />} />
                <Route path="progreso/historial" element={<HistoryScreen />} />
                <Route path="calendario" element={<CalendarScreen />} />
                <Route path="perfil" element={<ProfileScreen />} />
              </Route>
              <Route path="sesion/:sessionId" element={<SessionScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster theme="dark" position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
