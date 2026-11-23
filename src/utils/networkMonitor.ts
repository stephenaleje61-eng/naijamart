const DEFAULT_PROBE_TIMEOUT_MS = 5000;

let activeProbePromise: Promise<boolean> | null = null;

/**
 * Performs a real lightweight network check against the NIGERIA CAMPUS MARKET server
 * instead of blindly trusting `navigator.onLine` (which frequently gives false negatives
 * on Android 4G/Wi-Fi handoffs and Chromium Data Saver modes).
 */
export async function checkServerReachable(timeoutMs = DEFAULT_PROBE_TIMEOUT_MS): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return true;
  }

  if (activeProbePromise) {
    return activeProbePromise;
  }

  activeProbePromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`/api/health?ping=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      if (res.ok) {
        return true;
      }
    } catch {
      // Fall through to lightweight static asset check in case API endpoint is temporarily restarting
    } finally {
      clearTimeout(timer);
    }

    const fallbackController = new AbortController();
    const fallbackTimer = setTimeout(() => fallbackController.abort(), Math.min(timeoutMs, 3500));
    try {
      const staticRes = await fetch(`/manifest.json?ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: fallbackController.signal
      });
      return staticRes.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(fallbackTimer);
    }
  })().finally(() => {
    activeProbePromise = null;
  });

  return activeProbePromise;
}

/**
 * Verifies whether a device actually has working internet before blocking an action.
 * If `navigator.onLine` is true/undefined, lets the request run directly without delay.
 * If `navigator.onLine` reads false, tests `/api/health` first so Android 4G users are not falsely blocked.
 */
export async function verifyRealConnectivity(timeoutMs = 3500): Promise<boolean> {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    return true;
  }
  return checkServerReachable(timeoutMs);
}
