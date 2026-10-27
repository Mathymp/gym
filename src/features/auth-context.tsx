import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { initSync } from "@/lib/sync";
import { requireClient } from "@/lib/supabase";

type AuthValue = { session: Session | null; user: User | null; ready: boolean };
const AuthContext = createContext<AuthValue>({ session: null, user: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const client = requireClient();
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    void initSync();
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, user: session?.user ?? null, ready }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
