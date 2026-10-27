export function humanError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = message.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("offline")) {
    return "Sin conexión. Si estabas registrando, el cambio queda en el teléfono hasta sincronizar.";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "Ese correo ya tiene una cuenta. Entra con tu contraseña.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirma el correo antes de entrar.";
  }
  if (lower.includes("does not exist") || lower.includes("schema cache")) {
    return "Falta aplicar las migraciones SQL en Supabase.";
  }
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "No tienes permiso para ese registro.";
  }
  if (lower.includes("forbidden")) return "Ese dato no pertenece a tu cuenta.";
  if (lower.includes("check constraint") || lower.includes("violates check")) {
    return "Hay un valor fuera del rango permitido.";
  }
  if (message) return "No se pudo completar. Revisa los datos e intenta otra vez.";
  return "No se pudo completar. Intenta otra vez.";
}
