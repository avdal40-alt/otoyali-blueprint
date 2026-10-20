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

import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import {
  resolvePlatformStaffState,
  shouldRefreshPlatformStaffState,
  type PlatformStaffClient,
  type PlatformStaffState,
} from "@/lib/auth/platform-staff";

export { platformStaffNavigationAction } from "@/lib/auth/platform-staff";

const PlatformStaffNavigationContext =
  createContext<PlatformStaffState>("unknown");

export function PlatformStaffNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<PlatformStaffState>("unknown");
  const requestVersion = useRef(0);

  const resolveStaffState = useCallback(async (supabase: PlatformStaffClient) => {
    const version = ++requestVersion.current;
    setState("unknown");
    const resolved = await resolvePlatformStaffState(supabase);
    if (version !== requestVersion.current) return;
    setState(resolved);
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setState("anonymous");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const staffClient = supabase as unknown as PlatformStaffClient;
    void resolveStaffState(staffClient);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        ++requestVersion.current;
        setState("anonymous");
        return;
      }
      if (shouldRefreshPlatformStaffState(event)) {
        void resolveStaffState(staffClient);
      }
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
