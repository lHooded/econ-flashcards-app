import { createContext, useContext } from "react";
import type { SyncStatus } from "../sync/model";

export interface SyncContextValue {
  readonly status: SyncStatus;
  readonly createGroup: () => Promise<void>;
  readonly joinGroup: (pairingCode: string) => Promise<void>;
  readonly syncNow: () => Promise<void>;
  readonly getPairingCode: () => Promise<string>;
  readonly getPairingLink: () => Promise<string>;
  readonly disconnect: () => Promise<void>;
  readonly deleteRemote: () => Promise<void>;
}

export const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (context === undefined)
    throw new Error("useSync must be used within a SyncProvider.");
  return context;
}
