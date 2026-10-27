import { createContext, useContext, type ReactNode } from "react";

type LocalUser = { id: string };
type AuthValue = { session: { user: LocalUser } | null; user: LocalUser | null; ready: boolean };

const user: LocalUser = { id: "mathy" };
const AuthContext = createContext<AuthValue>({ session: { user }, user, ready: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={{ session: { user }, user, ready: true }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
