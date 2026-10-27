import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button, Kicker, Page } from "@/components/ui";
import { buildRoutine } from "@/data/routine";
import { createRoutine, fetchGoals, fetchPlans, fetchWeights, saveGoal, saveProfile, saveWeight } from "@/lib/api";
import { humanError } from "@/lib/errors";
import { WEEKDAY_LABELS } from "@/lib/format";
import { newId } from "@/lib/utils";
import type { Goal } from "@/lib/types";
import { firstIssue, onboardingSchema } from "@/lib/validators";
import { useAuth } from "@/features/auth-context";
import { useProfile, useRefresh } from "@/features/use-data";

const defaultDays = [1, 2, 4, 5];

export function OnboardingScreen() {
  const profile = useProfile();
  const { user } = useAuth();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.data?.display_name ?? "");
  const [weight, setWeight] = useState("83");
  const [height, setHeight] = useState(profile.data?.height_cm ? String(profile.data.height_cm) : "170");
  const [goal, setGoal] = useState("76");
  const [days, setDays] = useState<number[]>(defaultDays);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function toggleDay(day: number) {
    setDays((current) => {
      if (current.includes(day)) return current.filter((item) => item !== day);
      if (current.length >= 4) return current;
      return [...current, day].sort((a, b) => a - b);
    });
  }

  async function finish() {
    if (!profile.data || !user) return;
    const parsed = onboardingSchema.safeParse({
      name,
      weight: Number(weight.replace(",", ".")),
      height: Number(height.replace(",", ".")),
      goal: Number(goal.replace(",", ".")),
      days,
    });
    if (!parsed.success) {
      setError(firstIssue(parsed.error));
      return;
    }
    const { name: displayName, weight: weightKg, height: heightCm, goal: goalKg } = parsed.data;
    setPending(true);
    setError("");
    try {
      const plans = await fetchPlans();
      if (plans.length === 0) await createRoutine(days);
      const weights = await fetchWeights();
      if (weights.length === 0) {
        const id = newId();
        await saveWeight(
          {
            id,
            user_id: user.id,
            client_id: id,
            logged_at: new Date().toISOString(),
            weight_kg: weightKg,
            notes: "Peso inicial",
            created_at: new Date().toISOString(),
            updated_at: "",
          },
          "insert",
        );
      }
      const goals = await fetchGoals();
      if (!goals.some((item) => item.goal_type === "body_weight")) {
        await saveGoal(makeGoal(user.id, "body_weight", goalKg, "Peso"), "insert");
      }
      if (!goals.some((item) => item.goal_type === "weekly_workouts")) {
        await saveGoal(makeGoal(user.id, "weekly_workouts", days.length, "Entrenamientos por semana"), "insert");
      }
      await saveProfile(profile.data, {
        display_name: displayName,
        height_cm: heightCm,
        onboarding_completed: true,
      });
      await refresh();
      navigate("/");
    } catch (caught) {
      const message = humanError(caught);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  const preview = buildRoutine(days).filter((day) => day.dayKind === "strength");

  return (
    <Page className="min-h-dvh pb-10">
      <Kicker>Paso {step + 1} de 3</Kicker>
      {step === 0 ? (
        <section className="flex flex-col gap-6">
          <h1 className="text-4xl font-semibold tracking-tight">Cómo te llamamos</h1>
          <input className="h-14 rounded-2xl border border-line bg-surface px-4 text-lg" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" />
          <Button size="lg" onClick={() => (name.trim() ? setStep(1) : setError("Escribe tu nombre."))}>
            Seguir
          </Button>
        </section>
      ) : null}
      {step === 1 ? (
        <section className="flex flex-col gap-5">
          <h1 className="text-4xl font-semibold tracking-tight">Tu punto de partida</h1>
          <NumberField label="Peso actual" value={weight} onChange={setWeight} unit="kg" />
          <NumberField label="Estatura" value={height} onChange={setHeight} unit="cm" />
          <NumberField label="Peso meta" value={goal} onChange={setGoal} unit="kg" />
          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep(0)}>Atrás</Button>
            <Button size="lg" className="flex-1" onClick={() => setStep(2)}>Seguir</Button>
          </div>
        </section>
      ) : null}
      {step === 2 ? (
        <section className="flex flex-col gap-5">
          <h1 className="text-4xl font-semibold tracking-tight">Días de fuerza</h1>
          <p className="text-sm leading-6 text-muted">Elige hasta cuatro. La rutina inicial se acomoda en esos días. El resto queda libre para cardio o descanso.</p>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const selected = days.includes(day);
              return (
                <button
                  key={day}
                  className={`h-12 rounded-2xl border ${selected ? "border-lime text-lime" : "border-line text-muted"}`}
                  onClick={() => toggleDay(day)}
                  aria-pressed={selected}
                >
                  {WEEKDAY_LABELS[day]}
                </button>
              );
            })}
          </div>
          <ul className="border-t border-line text-sm">
            {preview.map((day) => (
              <li key={day.weekday} className="flex justify-between border-b border-line py-3">
                <span>{WEEKDAY_LABELS[day.weekday]}</span>
                <span className="text-muted">{day.label}</span>
              </li>
            ))}
          </ul>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep(1)}>Atrás</Button>
            <Button size="lg" className="flex-1" disabled={pending} onClick={() => void finish()}>
              {pending ? "Creando tu rutina" : "Empezar"}
            </Button>
          </div>
        </section>
      ) : null}
      {step !== 2 && error ? <p className="text-sm text-danger">{error}</p> : null}
    </Page>
  );
}

function NumberField({ label, value, onChange, unit }: { label: string; value: string; onChange: (value: string) => void; unit: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <span className="flex h-14 items-center rounded-2xl border border-line bg-surface px-4">
        <input inputMode="decimal" className="w-full bg-transparent text-lg tabular outline-none" value={value} onChange={(event) => onChange(event.target.value)} />
        <span className="text-sm text-faint">{unit}</span>
      </span>
    </label>
  );
}

function makeGoal(userId: string, type: Goal["goal_type"], target: number, label: string): Goal {
  const id = newId();
  return {
    id,
    user_id: userId,
    client_id: id,
    goal_type: type,
    target_value: target,
    exercise_id: null,
    measurement_key: null,
    label,
    deadline: null,
    created_at: new Date().toISOString(),
    updated_at: "",
  };
}
