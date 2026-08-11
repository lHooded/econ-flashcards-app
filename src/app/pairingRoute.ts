import { parseHashLocation, type ParsedHashLocation } from "./hashRoute";
import { pairingCodeFromHash } from "../sync/pairing";

export function capturePairingRoute(): ParsedHashLocation {
  const parsed = parseHashLocation(window.location.hash);
  const pairingCode = pairingCodeFromHash(window.location.hash);
  if (pairingCode === null) return parsed;
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}#/settings`,
  );
  return { ...parsed, route: "/settings", pairingCode };
}
