import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), { error: "Ingresa un correo válido." });

export const passwordSchema = z.string().min(8, { error: "La contraseña debe tener al menos 8 caracteres." }).max(72);

export const onboardingSchema = z.object({
  name: z.string().trim().min(1, { error: "Escribe tu nombre." }).max(40),
  weight: z.number().min(30, { error: "El peso mínimo es 30 kg." }).max(300, { error: "El peso máximo es 300 kg." }),
  height: z.number().min(100, { error: "La estatura mínima es 100 cm." }).max(250, { error: "La estatura máxima es 250 cm." }),
  goal: z.number().min(30, { error: "La meta mínima es 30 kg." }).max(300, { error: "La meta máxima es 300 kg." }),
  days: z.array(z.number().int().min(1).max(7)).min(1, { error: "Elige al menos un día de fuerza." }).max(4),
});

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Revisa los datos.";
}
