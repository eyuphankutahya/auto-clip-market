import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Ctx = { user: User | null; isAdmin: boolean; account: Tables<"customer_accounts"> | null; loading: boolean };
const AuthCtx = createContext<Ctx>({ user: null, isAdmin: false, account: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ user: null, isAdmin: false, account: null, loading: true });
  useEffect(() => {
    const load = async (user: User | null) => {
      if (!user) return setState({ user: null, isAdmin: false, account: null, loading: false });
      const [{ data: roles }, { data: acc }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("customer_accounts").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setState({ user, isAdmin: !!roles?.some((r) => r.role === "admin"), account: acc ?? null, loading: false });
    };
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(() => load(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
