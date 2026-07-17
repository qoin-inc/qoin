'use client';

import React, { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import liff from '@line/liff';

const LIFF_INIT_TIMEOUT_MS = 8000;

type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

type LiffContextValue = {
  isReady: boolean;
  isInitialized: boolean;
  liff: typeof liff;
  lineProfile: LineProfile | null;
  initializationError: string | null;
};

const LiffContext = createContext<LiffContextValue | null>(null);

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number) => new Promise<T>((resolve, reject) => {
  const timeoutId = window.setTimeout(() => reject(new Error('LIFF initialization timed out.')), timeoutMs);
  promise.then(
    (value) => {
      window.clearTimeout(timeoutId);
      resolve(value);
    },
    (error) => {
      window.clearTimeout(timeoutId);
      reject(error);
    },
  );
});

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

export const useLiff = () => {
  const context = useContext(LiffContext);
  if (!context) throw new Error('useLiff must be used within LiffProvider.');
  return context;
};

const LiffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId || !shouldAutoInitializeLiff()) {
      setIsInitialized(true);
      return;
    }

    const initialize = async () => {
      try {
        await withTimeout(liff.init({ liffId }), LIFF_INIT_TIMEOUT_MS);
        if (liff.isLoggedIn()) {
          const directProfile = await liff.getProfile().catch(() => null);
          if (!cancelled && directProfile) {
            setProfile(directProfile);
          } else {
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
      } catch (error) {
        if (!cancelled) {
          setInitializationError(error instanceof Error ? error.message : 'LIFF initialization failed.');
        }
      } finally {
        if (!cancelled) setIsInitialized(true);
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<LiffContextValue>(() => ({
    isReady: true,
    isInitialized,
    liff,
    lineProfile: profile,
    initializationError,
  }), [isInitialized, profile, initializationError]);

  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
};

export default LiffProvider;
