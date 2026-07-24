import { useCallback, useEffect, useState } from "react";
import { disablePush, enablePush, isSubscribed, permissionState, pushSupported } from "@/lib/push";

// Tracks whether push is on and exposes a toggle. `denied` means the browser
// permission was blocked (the user must re-allow it in site settings).
export function usePush() {
  const supported = pushSupported();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(permissionState() === "denied");

  useEffect(() => {
    isSubscribed().then(setEnabled).catch(() => {});
  }, []);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        const result = await enablePush();
        setEnabled(result === "granted");
        setDenied(result === "denied");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, enabled]);

  return { supported, enabled, busy, denied, toggle };
}
