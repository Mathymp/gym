import type { SessionTree } from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth-context";
import {
  activePlan,
  fetchCardio,
  fetchCompletedEntries,
  fetchExercises,
  fetchGoals,
  fetchMeasurements,
  fetchOpenSession,
  fetchOverrides,
  fetchPhotos,
  fetchPlans,
  fetchProfile,
  fetchSession,
  fetchSessions,
  fetchWeights,
  todayIso,
} from "@/lib/api";

export function useProfile() {
  const { session, ready } = useAuth();
  return useQuery({ queryKey: ["profile"], queryFn: fetchProfile, enabled: ready && Boolean(session) });
}

export function usePlans() {
  return useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
}

export function useExercises() {
  return useQuery({ queryKey: ["exercises"], queryFn: fetchExercises });
}

export function useOpenSession() {
  return useQuery({ queryKey: ["open-session"], queryFn: fetchOpenSession });
}

export function useSession(id: string) {
  return useQuery({ queryKey: ["session", id], queryFn: () => fetchSession(id), enabled: Boolean(id) });
}

export function useWeights() {
  return useQuery({ queryKey: ["weights"], queryFn: fetchWeights });
}

export function useMeasurements() {
  return useQuery({ queryKey: ["measurements"], queryFn: fetchMeasurements });
}

export function useCardio() {
  return useQuery({ queryKey: ["cardio"], queryFn: fetchCardio });
}

export function useGoals() {
  return useQuery({ queryKey: ["goals"], queryFn: fetchGoals });
}

export function usePhotos() {
  return useQuery({ queryKey: ["photos"], queryFn: fetchPhotos });
}

export function useOverrides() {
  return useQuery({ queryKey: ["overrides"], queryFn: fetchOverrides });
}

export function useEntries() {
  return useQuery({ queryKey: ["entries"], queryFn: fetchCompletedEntries });
}

export function useHistory() {
  return useQuery({ queryKey: ["sessions"], queryFn: fetchSessions });
}

export function useActivePlan() {
  const profile = useProfile();
  const plans = usePlans();
  return {
    profile,
    plans,
    plan: activePlan(plans.data ?? [], profile.data ?? null),
    today: todayIso(),
  };
}

export function useRefresh() {
  const client = useQueryClient();
  return async () => {
    await client.invalidateQueries();
  };
}

export function useSetSession() {
  const client = useQueryClient();
  return (session: SessionTree) => {
    client.setQueryData(["session", session.id], session);
    const open = session.status === "active" || session.status === "paused" ? session : null;
    client.setQueryData(["open-session"], open);
  };
}
