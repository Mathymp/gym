import { useState, type FormEvent } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ScreenSkeleton } from "@/components/shell";
import { Button, Kicker, Page, TextField } from "@/components/ui";
import { supabaseEnv } from "@/lib/env";
import { humanError } from "@/lib/errors";
import { requireClient } from "@/lib/supabase";
import { emailSchema, firstIssue, passwordSchema } from "@/lib/validators";
import { useAuth } from "@/features/auth-context";
import { useProfile } from "@/features/use-data";

export function SetupScreen() {
  return (
    <Page className="min-h-dvh justify-center pb-16">
      <Kicker>FORMA</Kicker>
      <h1 className="text-4xl font-semibold tracking-tight">Falta conectar Supabase</h1>
      <p className="max-w-md text-sm leading-6 text-muted">
        Crea un proyecto en Supabase, ejecuta en orden los archivos de supabase/migrations y guarda la URL y la clave anónima en .env.local. No uses la clave service_role.
      </p>
      <pre className="overflow-auto rounded-2xl bg-surface p-4 text-xs leading-6 text-muted">{`VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon`}</pre>
    </Page>
  );
}

export function RequireUser() {
  const { session, ready } = useAuth();
  const profile = useProfile();
  const location = useLocation();
  if (!ready || (session && profile.isLoading)) return <ScreenSkeleton />;
  if (!session) return <Navigate to="/ingresar" replace />;
  if (profile.isError) {
    return (
      <Page>
        <h1 className="text-2xl font-semibold">No pudimos cargar tu perfil</h1>
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

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const parsedEmail = emailSchema.safeParse(email);
    const parsedPassword = passwordSchema.safeParse(password);
    if (!parsedEmail.success) {
      setError(firstIssue(parsedEmail.error));
      return;
    }
    if (!parsedPassword.success) {
      setError(firstIssue(parsedPassword.error));
      return;
    }
    setPending(true);
    try {
      const client = requireClient();
      if (mode === "register") {
        const { data, error: signError } = await client.auth.signUp({ email: parsedEmail.data, password: parsedPassword.data });
        if (signError) throw signError;
        if (!data.session) {
          setConfirm(true);
          return;
        }
      } else {
        const { error: signError } = await client.auth.signInWithPassword({ email: parsedEmail.data, password: parsedPassword.data });
        if (signError) throw signError;
      }
      navigate("/");
    } catch (caught) {
      const message = humanError(caught);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  if (!supabaseEnv.configured) return <SetupScreen />;

  return (
    <Page className="min-h-dvh justify-end pb-12">
      <Kicker>FORMA</Kicker>
      <h1 className="text-4xl font-semibold tracking-tight">{mode === "login" ? "Entra a tu registro" : "Crea tu cuenta"}</h1>
      <p className="text-sm text-muted">Tu entrenamiento queda en tu cuenta. Nadie más lo ve.</p>
      {confirm ? (
        <p className="text-sm leading-6">Revisa tu correo para confirmar la cuenta y después entra.</p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
          <TextField label="Correo" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Espera un momento" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>
      )}
      <Link className="text-sm text-lime" to={mode === "login" ? "/crear-cuenta" : "/ingresar"}>
        {mode === "login" ? "Crear una cuenta" : "Ya tengo cuenta"}
      </Link>
    </Page>
  );
}
