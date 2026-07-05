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

    const checkExistingUser = async () => {
      if (initialRedirectTarget) {
        if (initialRedirectTarget === "portal") {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session && lineProfile?.userId) {
            await supabase.auth.signInWithPassword({
              email: `${lineProfile.userId}@line.eltown.local`,
              password: `lineAuth_${lineProfile.userId}_eltown`,
            });
          }
          window.location.href = "/portal";
          return;
        }

        if (initialRedirectTarget === "resident") router.push("/resident/");
        else if (initialRedirectTarget === "admin") router.push("/admin/");
        else router.push(`/resident/?open=${initialRedirectTarget}`);
        return;
      }

      if (lineProfile?.userId) {
        try {
          const { data } = await supabase
            .from("resident_rosters")
            .select("id")
            .or(`user_auth_id.eq.${lineProfile.userId},family_user_auth_id_1.eq.${lineProfile.userId},family_user_auth_id_2.eq.${lineProfile.userId}`)
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
