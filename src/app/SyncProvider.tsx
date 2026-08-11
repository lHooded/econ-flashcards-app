import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { SyncContext, type SyncContextValue } from "./syncContext";
import type { SyncCoordinator } from "../sync/coordinator";

export function SyncProvider({
  coordinator,
  children,
}: PropsWithChildren<{ readonly coordinator: SyncCoordinator }>) {
  const [status, setStatus] = useState(coordinator.getStatus());

  useEffect(() => coordinator.subscribe(setStatus), [coordinator]);

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      createGroup: () => coordinator.createGroup(),
      joinGroup: (pairingCode) => coordinator.joinGroup(pairingCode),
      syncNow: () => coordinator.syncNow(),
      getPairingCode: () => coordinator.getPairingCode(),
      getPairingLink: () => coordinator.getPairingLink(),
      disconnect: () => coordinator.disconnect(),
      deleteRemote: () => coordinator.deleteRemote(),
    }),
    [coordinator, status],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
