"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/LiffProvider";
import { supabase } from "@/lib/supabaseClient";

type InitialRedirectHandlerProps = {
  initialRedirectTarget: string | null;
};

const withoutLineUserIdColumns = (payload: Record<string, any>) => {
  const { line_user_id, family_line_user_id_1, family_line_user_id_2, ...fallback } = payload;
  return fallback;
};

export default function InitialRedirectHandler({ initialRedirectTarget }: InitialRedirectHandlerProps) {
  const router = useRouter();
  const { isInitialized, lineProfile } = useLiff();

  useEffect(() => {
    if (!isInitialized) return;
    if (!initialRedirectTarget) {
      delete document.documentElement.dataset.initialMenuReady;
    }

    const revealInitialMenu = () => {
      document.documentElement.dataset.initialMenuReady = "true";
    };

    const ensureSupabaseSessionFromLineProfile = async () => {
      if (!lineProfile?.userId) return null;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) return session;

      const email = `${lineProfile.userId}@line.eltown.local`;
      const password = `lineAuth_${lineProfile.userId}_eltown`;
      const login = await supabase.auth.signInWithPassword({ email, password });

      if (!login.error) return login.data.session;
      if (!login.error.message.includes("Invalid login credentials")) throw login.error;

      const signup = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: lineProfile.displayName, avatar_url: lineProfile.pictureUrl } },
      });
      if (signup.error) throw signup.error;
      return signup.data.session;
    };

    const syncRosterLineUserId = async (roster: any, userId: string) => {
      if (!roster?.id || !userId || !lineProfile?.userId) return;

      const payload: Record<string, any> = {};
      if (roster.user_auth_id === userId) payload.line_user_id = lineProfile.userId;
      if (roster.family_user_auth_id_1 === userId) payload.family_line_user_id_1 = lineProfile.userId;
      if (roster.family_user_auth_id_2 === userId) payload.family_line_user_id_2 = lineProfile.userId;
      if (Object.keys(payload).length === 0) return;

      const { error } = await supabase.from("resident_rosters").update(payload).eq("id", roster.id);
      if (error && /line_user_id|family_line_user_id/i.test(String(error.message || ""))) {
        const fallbackPayload = withoutLineUserIdColumns(payload);
        if (Object.keys(fallbackPayload).length > 0) {
          await supabase.from("resident_rosters").update(fallbackPayload).eq("id", roster.id);
        }
      } else if (error) {
        console.warn("LINE user ID sync failed:", error.message);
      }
    };

    const hasLinkedResidentRoster = async (userId: string) => {
      const { data } = await supabase
        .from("resident_rosters")
        .select("id,user_auth_id,family_user_auth_id_1,family_user_auth_id_2")
        .or(`user_auth_id.eq.${userId},family_user_auth_id_1.eq.${userId},family_user_auth_id_2.eq.${userId}`)
        .limit(1);

      if (data && data.length > 0) {
        await syncRosterLineUserId(data[0], userId);
        return true;
      }

      return false;
    };

    const checkExistingUser = async () => {
      if (initialRedirectTarget) {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!existingSession && !lineProfile?.userId) {
          revealInitialMenu();
          return;
        }

        if (initialRedirectTarget === "resident") {
          await ensureSupabaseSessionFromLineProfile();
          window.location.href = "/resident/";
          return;
        }

        if (initialRedirectTarget === "portal") {
          await ensureSupabaseSessionFromLineProfile();
          window.location.href = "/portal";
          return;
        }

        if (initialRedirectTarget === "admin") router.push("/admin/");
        else {
          await ensureSupabaseSessionFromLineProfile();
          window.location.href = `/resident/?open=${encodeURIComponent(initialRedirectTarget)}`;
        }
        return;
      }

      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user?.id && await hasLinkedResidentRoster(existingSession.user.id)) {
          router.replace("/resident/");
          return;
        }
      } catch (error) {
        console.error("Existing session check failed:", error);
      }

      if (lineProfile?.userId) {
        try {
          const session = await ensureSupabaseSessionFromLineProfile();
          const userId = session?.user?.id || lineProfile.userId;

          if (await hasLinkedResidentRoster(userId)) {
            router.replace("/resident/");
            return;
          }
        } catch (error) {
          console.error("Auto login check failed:", error);
        }
      }

      revealInitialMenu();
    };

    checkExistingUser();
  }, [isInitialized, lineProfile, initialRedirectTarget, router]);

  return null;
}
