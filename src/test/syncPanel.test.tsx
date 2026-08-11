import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncContext, type SyncContextValue } from "../app/syncContext";
import { SyncPanel } from "../components/sync/SyncPanel";
import type { SyncStatus } from "../sync/model";

const codeA = "ecs1:old-secret";
const codeB = "ecs1:new-secret";

function status(connected: boolean): SyncStatus {
  return {
    apiConfigured: true,
    connected,
    phase: connected ? "synced" : "disconnected",
    lastSyncedAt: null,
    message: null,
  };
}

function value(
  currentStatus: SyncStatus,
  overrides: Partial<SyncContextValue> = {},
): SyncContextValue {
  return {
    status: currentStatus,
    createGroup: vi.fn(async () => undefined),
    joinGroup: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    getPairingCode: vi.fn(async () => codeA),
    getPairingLink: vi.fn(
      async () => "https://macro.example.com/#/settings?pair=old-secret",
    ),
    disconnect: vi.fn(async () => undefined),
    deleteRemote: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("sync pairing display lifecycle", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not retain an old group credential after disconnect and recreate", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const disconnect = vi.fn(async () => undefined);
    const createGroup = vi.fn(async () => undefined);
    const getPairingCode = vi
      .fn<SyncContextValue["getPairingCode"]>()
      .mockResolvedValueOnce(codeA)
      .mockResolvedValueOnce(codeB);
    const getPairingLink = vi
      .fn<SyncContextValue["getPairingLink"]>()
      .mockResolvedValueOnce("https://macro.example.com/#/settings?pair=old-secret")
      .mockResolvedValueOnce("https://macro.example.com/#/settings?pair=new-secret");
    let currentStatus = status(true);
    const context = value(currentStatus, {
      disconnect,
      createGroup,
      getPairingCode,
      getPairingLink,
    });
    const rendered = render(
      <SyncContext.Provider value={context}>
        <SyncPanel />
      </SyncContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pair another device" }));
    expect(await screen.findByText(codeA)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Disconnect this device" }));
    await waitFor(() => expect(disconnect).toHaveBeenCalledTimes(1));

    expect(screen.queryByText(codeA)).not.toBeInTheDocument();
    currentStatus = status(false);
    rendered.rerender(
      <SyncContext.Provider value={{ ...context, status: currentStatus }}>
        <SyncPanel />
      </SyncContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create cross-device sync" }));
    await waitFor(() => expect(createGroup).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(codeA)).not.toBeInTheDocument();

    currentStatus = status(true);
    rendered.rerender(
      <SyncContext.Provider value={{ ...context, status: currentStatus }}>
        <SyncPanel />
      </SyncContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pair another device" }));
    expect(await screen.findByText(codeB)).toBeInTheDocument();
    expect(screen.queryByText(codeA)).not.toBeInTheDocument();
  });
});
