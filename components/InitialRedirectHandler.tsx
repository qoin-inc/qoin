"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "@/components/LiffProvider";
import { supabase } from "@/lib/supabaseClient";
import { exchangeLineSession, isVerifiedStagingLineUser } from "@/lib/lineResidentAuth";

type InitialRedirectHandlerProps = {
  initialRedirectTarget: string | null;
};

const LIFF_LOGIN_ATTEMPT_KEY = "eltown.liff.loginAttemptAt";
const LIFF_LOGIN_RETRY_MS = 2 * 60 * 1000;
const INITIAL_REDIRECT_WATCHDOG_MS = 12000;

export default function InitialRedirectHandler({ initialRedirectTarget }: InitialRedirectHandlerProps) {
  const router = useRouter();
  const { isInitialized, lineProfile, liff } = useLiff();

  useEffect(() => {
    if (!isInitialized) return;
    if (!initialRedirectTarget) {
      delete document.documentElement.dataset.initialMenuReady;
    }

    const revealInitialMenu = () => {
      document.documentElement.dataset.initialMenuReady = "true";
    };

    const moveToResidentFallback = (reason: string) => {
      const fallbackParams = new URLSearchParams({ line_error: reason });
      if (initialRedirectTarget === "portal" || initialRedirectTarget === "portal-latest") {
        fallbackParams.set("redirect_after", "portal");
        fallbackParams.set("latest", "1");
      } else if (initialRedirectTarget === "resident") {
        fallbackParams.set("open", "latest");
      } else if (initialRedirectTarget && initialRedirectTarget !== "resident") {
        fallbackParams.set("open", initialRedirectTarget);
      }
      window.location.replace(`/resident/?${fallbackParams.toString()}`);
    };

    // LIFF and authentication run inside mobile WebViews where a pending SDK
    // or network promise can occasionally never settle. Always provide an
    // escape from the root loading screen.
    const redirectWatchdog = initialRedirectTarget && initialRedirectTarget !== "admin"
      ? window.setTimeout(() => {
          if (window.location.pathname === "/") moveToResidentFallback("entry_timeout");
        }, INITIAL_REDIRECT_WATCHDOG_MS)
      : null;

    const ensureSupabaseSessionFromLineProfile = async () => {
      if (!lineProfile?.userId) return null;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (isVerifiedStagingLineUser(session.user, lineProfile.userId)) return session;

        // A mobile browser can retain a previous resident/admin session. Never
        // use it for a different LINE identity.
        await supabase.auth.signOut();
      }

      return exchangeLineSession(liff);
    };

    const hasLinkedResidentRoster = async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || session.user.id !== userId || !isVerifiedStagingLineUser(session.user)) return false;
      const response = await fetch('/api/resident/roster', {
        headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
      });
      if (!response.ok) return false;
      const result = await response.json().catch(() => ({}));
      return Boolean(result.roster);
    };

    const checkExistingUser = async () => {
      if (initialRedirectTarget) {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!existingSession && !lineProfile?.userId) {
          if (initialRedirectTarget !== "admin") {
            const lastAttemptAt = Number(window.sessionStorage.getItem(LIFF_LOGIN_ATTEMPT_KEY) || 0);
            const canRetryLogin = !lastAttemptAt || Date.now() - lastAttemptAt >= LIFF_LOGIN_RETRY_MS;
            if (!liff.isLoggedIn() && !liff.isInClient() && canRetryLogin) {
              window.sessionStorage.setItem(LIFF_LOGIN_ATTEMPT_KEY, String(Date.now()));
              // In an external mobile browser, opening the LIFF URL alone does
              // not authenticate the user. The SDK login flow is required.
              liff.login();
              return;
            }
          }

          // Never leave a LIFF callback on the permanent loading screen.
          // Move to the resident login screen without starting another
          // automatic LIFF round-trip, so the user can retry explicitly.
          if (initialRedirectTarget === "admin") {
            router.replace("/admin/");
            return;
          }

          moveToResidentFallback("profile_unavailable");
          return;
        }

        if (initialRedirectTarget === "resident") {
          await ensureSupabaseSessionFromLineProfile();
          window.sessionStorage.removeItem(LIFF_LOGIN_ATTEMPT_KEY);
          router.replace("/resident/?open=latest");
          return;
        }

        if (initialRedirectTarget === "portal" || initialRedirectTarget === "portal-latest") {
          await ensureSupabaseSessionFromLineProfile();
          window.sessionStorage.removeItem(LIFF_LOGIN_ATTEMPT_KEY);
          router.replace("/portal?latest=1");
          return;
        }

        if (initialRedirectTarget === "admin") router.push("/admin/");
        else {
          await ensureSupabaseSessionFromLineProfile();
          router.replace(`/resident/?open=${encodeURIComponent(initialRedirectTarget)}`);
        }
        return;
      }

      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user?.email?.endsWith('@line.eltown.local')
          && !isVerifiedStagingLineUser(existingSession.user, lineProfile?.userId)) {
          await supabase.auth.signOut();
        } else if (existingSession?.user?.id && await hasLinkedResidentRoster(existingSession.user.id)) {
          router.replace("/resident/");
          return;
        }
      } catch (error) {
        console.error("Existing session check failed:", error);
      }

      if (lineProfile?.userId) {
        try {
          const session = await ensureSupabaseSessionFromLineProfile();
          if (session?.user?.id && await hasLinkedResidentRoster(session.user.id)) {
            router.replace("/resident/");
            return;
          }
        } catch (error) {
          console.error("Auto login check failed:", error);
        }
      }

      revealInitialMenu();
    };

    checkExistingUser().catch((error) => {
      console.error("Initial LINE redirect failed:", error);
      if (initialRedirectTarget === "admin") {
        router.replace("/admin/");
      } else if (initialRedirectTarget) {
        moveToResidentFallback("authentication_failed");
      } else {
        revealInitialMenu();
      }
    });

    return () => {
      if (redirectWatchdog !== null) window.clearTimeout(redirectWatchdog);
    };
  }, [isInitialized, lineProfile, initialRedirectTarget, router]);

  return null;
}
