export type WeightPoint = {
  label: string;
  weight: number;
  average: number | null;
};

export type ExercisePoint = {
  label: string;
  weight: number | null;
  volume: number;
};

export type MuscleBar = {
  label: string;
  volume: number;
};

export type WeekBar = {
  label: string;
  workouts: number;
  minutes: number;
};
