import { useEffect, useState } from "react";

export function useNow(updateEveryMs = 60 * 1000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), updateEveryMs);
    return () => window.clearInterval(timer);
  }, [updateEveryMs]);

  return nowMs;
}
