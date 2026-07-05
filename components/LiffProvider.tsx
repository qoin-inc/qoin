'use client';
// Force rebuild after cache clear
import React, { ReactNode, useEffect, useState } from 'react';
import liff from '@line/liff';

/**
 * Hook to access LIFF SDK data.
 * Returns readiness flags, the liff instance, and the user profile when available.
 */
export const useLiff = () => {
  const [profile, setProfile] = useState<any>(null);

  // Attempt to initialise LIFF – ignore any errors to avoid blocking UI.
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) return;
    liff
      .init({ liffId })
      .catch(() => {
        // LIFF init failed – continue without it.
      })
      .finally(() => {
        if (liff.isLoggedIn()) {
          liff
            .getProfile()
            .then(p => setProfile(p))
            .catch(() => {});
        }
      });
  }, []);

  return {
    isReady: true,
    isInitialized: true,
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
