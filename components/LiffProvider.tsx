import React, { ReactNode, useEffect, useState } from 'react';
import liff from '@line/liff';

/**
 * LiffProvider initializes the LINE Front-end Framework (LIFF).
 * It reads the LIFF ID from the environment variable NEXT_PUBLIC_LIFF_ID.
 * While initializing, it shows a loading indicator. Once ready, it renders the children.
 */
const LiffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      console.warn('NEXT_PUBLIC_LIFF_ID is not set – LIFF will not be initialized.');
      setReady(true);
      return;
    }
    liff
      .init({ liffId })
      .then(() => {
        setReady(true);
      })
      .catch(err => {
        console.error('LIFF init failed:', err);
        setError('LIFF initialization failed');
        setReady(true); // allow app to continue without LIFF
      });
  }, []);

  if (!ready) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return <>{children}</>;
};

/**
 * Hook to access LIFF SDK data.
 * Returns readiness flags, the liff instance, and the user profile when available.
 */
export const useLiff = () => {
  const [profile, setProfile] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (liff && liff.isReady && liff.isLoggedIn()) {
      liff.getProfile().then(p => setProfile(p));
      setInitialized(true);
    } else if (liff && liff.isReady) {
      // Not logged in – still considered initialized
      setInitialized(true);
    }
  }, []);

  return {
    isReady: liff?.isReady ?? false,
    isInitialized: initialized,
    liff,
    lineProfile: profile,
  };
};

export default LiffProvider;
