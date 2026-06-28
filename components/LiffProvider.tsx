"use client";
// components/LiffProvider.tsx
import React, { createContext, useEffect, useState, ReactNode } from 'react';

interface LiffContextProps {
  liff: any | null;
  isInitialized: boolean;
}

export const LiffContext = createContext<LiffContextProps>({ liff: null, isInitialized: false });

export const LiffProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [liff, setLiff] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Server 側では LIFF を初期化しない
    if (typeof window === 'undefined') {
      setIsInitialized(true);
      return;
    }
    const initLiff = async () => {
      try {
        const liffInstance = (window as any).liff;
        if (liffInstance) {
          await liffInstance.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
          setLiff(liffInstance);
        } else {
          console.warn('LIFF SDK not loaded');
        }
      } catch (e) {
        console.warn('LIFF init failed (placeholder)', e);
      } finally {
        setIsInitialized(true);
      }
    };
    initLiff();
  }, []);

  return (
    <LiffContext.Provider value={{ liff, isInitialized }}>
      {children}
    </LiffContext.Provider>
  );
};
export default LiffProvider;

export const useLiff = () => {
  const context = React.useContext(LiffContext);
  if (!context) {
    throw new Error('useLiff must be used within LiffProvider');
  }
  return { ...context, isInitialized: context.isInitialized };
};
