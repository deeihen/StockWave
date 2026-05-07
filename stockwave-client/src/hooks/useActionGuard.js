import { useCallback, useRef, useState } from "react";

export function useActionGuard(debounceMs = 500) {
  const lastRunRef = useRef({});
  const inFlightRef = useRef(new Set());
  const [, forceUpdate] = useState(0);

  const isRunning = useCallback((key) => inFlightRef.current.has(key), []);

  const run = useCallback(
    async (key, action) => {
      const now = Date.now();
      const last = lastRunRef.current[key] || 0;

      if (inFlightRef.current.has(key)) return;
      if (now - last < debounceMs) return;

      lastRunRef.current[key] = now;
      inFlightRef.current.add(key);
      forceUpdate((v) => v + 1);

      try {
        await action();
      } finally {
        inFlightRef.current.delete(key);
        forceUpdate((v) => v + 1);
      }
    },
    [debounceMs]
  );

  return { run, isRunning };
}
