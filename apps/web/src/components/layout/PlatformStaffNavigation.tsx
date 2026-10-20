"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type PlatformStaffNavigationState = "loading" | "staff" | "not_staff" | "unknown";

const PlatformStaffNavigationContext =
  createContext<PlatformStaffNavigationState>("loading");

export function platformStaffNavigationAction(
  state: PlatformStaffNavigationState,
): "admin" | "seller" | null {
  if (state === "staff") return "admin";
  if (state === "not_staff") return "seller";
  return null;
}

export function PlatformStaffNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<PlatformStaffNavigationState>("loading");
  const requestVersion = useRef(0);

  const resolveStaffState = useCallback(async (session: Session | null) => {
    const version = ++requestVersion.current;

    if (!session) {
      setState("not_staff");
      return;
    }

    setState("loading");
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("is_admin", {
      uid: session.user.id,
    });

    if (version !== requestVersion.current) return;
    setState(error ? "unknown" : data === true ? "staff" : "not_staff");
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setState("not_staff");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      void resolveStaffState(data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveStaffState(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resolveStaffState]);

  return (
    <PlatformStaffNavigationContext.Provider value={state}>
      {children}
    </PlatformStaffNavigationContext.Provider>
  );
}

export function usePlatformStaffNavigation() {
  return useContext(PlatformStaffNavigationContext);
}
