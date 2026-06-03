import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { getDatabase } from '../db/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveSession {
  sessionId: number;
  taskName: string;
  startTime: number;
}

interface AppContextValue {
  activeSession: ActiveSession | null;
  setActiveSession: (session: ActiveSession | null) => void;
  isDbReady: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    getDatabase()
      .then(() => setIsDbReady(true))
      .catch((e) => console.error('[AppContext] DB init error:', e));
  }, []);

  return (
    <AppContext.Provider value={{ activeSession, setActiveSession, isDbReady }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}
