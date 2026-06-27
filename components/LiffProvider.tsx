"use client";
// components/LiffProvider.tsx
import React, { createContext, useEffect, useState, ReactNode } from 'react';

interface LiffContextProps {
  liff: any | null;
  initialized: boolean;
}

export const LiffContext = createContext<LiffContextProps>({ liff: null, initialized: false });

export const LiffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [liff, setLiff] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Placeholder initialization – replace with actual LIFF SDK init when available
    const initLiff = async () => {
      try {
        // @ts-ignore – LIFF SDK is loaded externally in production
        const liffInstance = (window as any).liff;
        if (liffInstance) {
          await liffInstance.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
          setLiff(liffInstance);
        }
      } catch (e) {
        console.warn('LIFF init failed (placeholder)', e);
      } finally {
        setInitialized(true);
      }
    };
    initLiff();
  }, []);

  return (
    <LiffContext.Provider value={{ liff, initialized }}>
      {children}
    </LiffContext.Provider>
  );
};
