"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/LiffProvider";
import { supabase } from "@/lib/supabaseClient";

type InitialRedirectHandlerProps = {
  initialRedirectTarget: string | null;
};

export default function InitialRedirectHandler({ initialRedirectTarget }: InitialRedirectHandlerProps) {
  const router = useRouter();
  const { isInitialized, lineProfile } = useLiff();

  useEffect(() => {
    if (!isInitialized) return;

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

    const checkExistingUser = async () => {
      if (initialRedirectTarget) {
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
        else router.push(`/resident/?open=${initialRedirectTarget}`);
        return;
      }

      if (lineProfile?.userId) {
        try {
          const session = await ensureSupabaseSessionFromLineProfile();
          const userId = session?.user?.id || lineProfile.userId;
          const { data } = await supabase
            .from("resident_rosters")
            .select("id")
            .or(`user_auth_id.eq.${userId},family_user_auth_id_1.eq.${userId},family_user_auth_id_2.eq.${userId}`)
            .limit(1);

          if (data && data.length > 0) {
            router.push("/resident/");
          }
        } catch (error) {
          console.error("Auto login check failed:", error);
        }
      }
    };

    checkExistingUser();
  }, [isInitialized, lineProfile, initialRedirectTarget, router]);

  return null;
}
