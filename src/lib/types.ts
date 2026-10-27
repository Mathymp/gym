export type MuscleGroup =
  | "pecho"
  | "espalda"
  | "hombros"
  | "biceps"
  | "triceps"
  | "piernas"
  | "abdomen"
  | "cardio";

export type TrackingType = "weight_reps" | "reps" | "time" | "distance";
export type DayKind = "strength" | "rest" | "cardio" | "free";
export type SessionStatus = "active" | "paused" | "completed" | "abandoned";
export type PhotoAngle = "front" | "side" | "back";
export type GoalType = "body_weight" | "weekly_workouts" | "activity_days" | "strength" | "measurement";
export type MeasurementKey = "waist" | "abdomen" | "chest" | "hip" | "arm" | "thigh" | "neck";

export type Profile = {
  id: string;
  display_name: string;
  height_cm: number | null;
  timezone: string;
  onboarding_completed: boolean;
  active_plan_id: string | null;
  preferred_rest_seconds: number;
  rest_timer_enabled: boolean;
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Exercise = {
  id: string;
  user_id: string | null;
  client_id: string;
  slug: string | null;
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscles: string[];
  equipment: string;
  machine_name: string | null;
  instructions: string;
  common_mistakes: string;
  alternative_slugs: string[];
  tracking_type: TrackingType;
  created_at: string;
  updated_at: string;
};

export type WorkoutPlan = {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutPlanDay = {
  id: string;
  user_id: string;
  plan_id: string;
  client_id: string;
  weekday: number;
  label: string;
  day_kind: DayKind;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type WorkoutPlanExercise = {
  id: string;
  user_id: string;
  plan_day_id: string;
  exercise_id: string;
  client_id: string;
  sort_order: number;
  target_sets: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_seconds: number | null;
  rest_seconds: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type PlanExercise = WorkoutPlanExercise & { exercise: Exercise };
export type PlanDay = WorkoutPlanDay & { exercises: PlanExercise[] };
export type PlanTree = WorkoutPlan & { days: PlanDay[] };

export type WorkoutSession = {
  id: string;
  user_id: string;
  client_id: string;
  plan_id: string | null;
  plan_day_id: string | null;
  title: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  paused_ms: number;
  pause_started_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type WorkoutSessionExercise = {
  id: string;
  user_id: string;
  session_id: string;
  exercise_id: string;
  client_id: string;
  sort_order: number;
  notes: string;
  substituted_from_exercise_id: string | null;
  replaced: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutSet = {
  id: string;
  user_id: string;
  session_exercise_id: string;
  client_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_m: number | null;
  rpe: number | null;
  is_warmup: boolean;
  completed_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type SessionExercise = WorkoutSessionExercise & {
  exercise: Exercise;
  sets: WorkoutSet[];
};

export type SessionTree = WorkoutSession & { exercises: SessionExercise[] };

export type CardioSession = {
  id: string;
  user_id: string;
  client_id: string;
  exercise_id: string | null;
  activity_name: string;
  started_at: string;
  duration_seconds: number;
  distance_m: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type BodyWeightLog = {
  id: string;
  user_id: string;
  client_id: string;
  logged_at: string;
  weight_kg: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type BodyMeasurement = {
  id: string;
  user_id: string;
  client_id: string;
  measured_at: string;
  waist_cm: number | null;
  abdomen_cm: number | null;
  chest_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  neck_cm: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ProgressPhoto = {
  id: string;
  user_id: string;
  client_id: string;
  taken_at: string;
  angle: PhotoAngle;
  storage_path: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  client_id: string;
  goal_type: GoalType;
  target_value: number;
  exercise_id: string | null;
  measurement_key: MeasurementKey | null;
  label: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

export type ScheduleOverride = {
  id: string;
  user_id: string;
  client_id: string;
  plan_day_id: string;
  from_date: string;
  to_date: string;
  created_at: string;
  updated_at: string;
};

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  piernas: "Piernas",
  abdomen: "Abdomen",
  cardio: "Cardio",
};

export const MEASUREMENT_FIELDS: Array<{
  key: MeasurementKey;
  column: "waist_cm" | "abdomen_cm" | "chest_cm" | "hip_cm" | "arm_cm" | "thigh_cm" | "neck_cm";
  label: string;
}> = [
  { key: "waist", column: "waist_cm", label: "Cintura" },
  { key: "abdomen", column: "abdomen_cm", label: "Abdomen" },
  { key: "chest", column: "chest_cm", label: "Pecho" },
  { key: "hip", column: "hip_cm", label: "Cadera" },
  { key: "arm", column: "arm_cm", label: "Brazo" },
  { key: "thigh", column: "thigh_cm", label: "Muslo" },
  { key: "neck", column: "neck_cm", label: "Cuello" },
];

export const ANGLE_LABEL: Record<PhotoAngle, string> = {
  front: "Frontal",
  side: "Lateral",
  back: "Espalda",
};
