'use client';
// Force rebuild after cache clear
import React, { ReactNode, useEffect, useState } from 'react';
import liff from '@line/liff';

const shouldAutoInitializeLiff = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const isInitialEntryPath = window.location.pathname === '/';
  const isResidentPath = window.location.pathname.startsWith('/resident');
  const isPortalPath = window.location.pathname.startsWith('/portal');

  const hasInitialEntryParam = isInitialEntryPath && [
    'redirect',
    'goto',
    'open',
  ].some((key) => params.has(key));

  return isInitialEntryPath || isResidentPath || isPortalPath || hasInitialEntryParam || [
    'liff.state',
    'liffClientId',
    'liffRedirectUri',
    'code',
    'liff.hback',
  ].some((key) => params.has(key)) || [
    'access_token',
    'context_token',
    'feature_token',
    'id_token',
  ].some((key) => hashParams.has(key));
};

/**
 * Hook to access LIFF SDK data.
 * Returns readiness flags, the liff instance, and the user profile when available.
 */
export const useLiff = () => {
  const [profile, setProfile] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Attempt to initialise LIFF – ignore any errors to avoid blocking UI.
  useEffect(() => {
    let cancelled = false;
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId || !shouldAutoInitializeLiff()) {
      setIsInitialized(true);
      return;
    }

    const initialize = async () => {
      try {
        await liff.init({ liffId });
        if (liff.isLoggedIn()) {
          const lineProfile = await liff.getProfile().catch(() => null);
          if (!cancelled && lineProfile) {
            setProfile(lineProfile);
          } else {
            // The profile scope can be unavailable even when LIFF login itself
            // succeeded. The ID token still contains the stable LINE user ID.
            const idToken = liff.getDecodedIDToken();
            if (!cancelled && idToken?.sub) {
              setProfile({
                userId: idToken.sub,
                displayName: idToken.name || '',
                pictureUrl: idToken.picture || '',
              });
            }
          }
        }
      } catch {
        // LIFF init failed – continue without it.
      } finally {
        if (!cancelled) setIsInitialized(true);
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isReady: true,
    isInitialized,
    liff,
    lineProfile: profile,
  };
};

/**
 * Simple provider that always renders its children.
 * The previous loading / error UI has been removed to ensure the app UI appears immediately.
 */
const LiffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export default LiffProvider;
