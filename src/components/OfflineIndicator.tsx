import React, { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { checkServerReachable } from '../utils/networkMonitor.js';

export function useOnlineStatus() {
  // Default optimistic until proven unreachable by a real server probe
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let active = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const verifyConnectivity = async () => {
      const reachable = await checkServerReachable(4500);
      if (!active) return;

      setIsOnline((prev) => {
        if (!prev && reachable) {
          window.dispatchEvent(new CustomEvent('ncm:connection-restored'));
        }
        return reachable;
      });
    };

    const handleOnline = () => {
      verifyConnectivity().catch(() => {});
    };

    const handleOffline = () => {
      // Do not trust browser 'offline' event blindly — confirm with real server probe first!
      verifyConnectivity().catch(() => {});
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If navigator currently reports offline on boot, verify instead of locking out UI
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      verifyConnectivity().catch(() => {});
    }

    // When genuinely offline, automatically re-check every 6 seconds to recover when 4G returns
    if (!isOnline) {
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          verifyConnectivity().catch(() => {});
        }
      }, 6000);
    }

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [isOnline]);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [checking, setChecking] = useState(false);

  if (isOnline) return null;

  const handleManualRetry = async () => {
    setChecking(true);
    try {
      const ok = await checkServerReachable(5000);
      if (ok) {
        window.dispatchEvent(new CustomEvent('ncm:connection-restored'));
        window.dispatchEvent(new Event('online'));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-5 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-[#222222] border-2 border-[#F68B1F] px-3.5 py-2 text-xs font-bold text-white shadow-2xl">
      <WifiOff className="w-4 h-4 text-[#F68B1F] shrink-0" />
      <span>Connection lost — waiting for internet</span>
      <button
        type="button"
        onClick={handleManualRetry}
        disabled={checking}
        className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-[11px] font-black cursor-pointer disabled:opacity-60"
      >
        <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
        <span>{checking ? 'Testing...' : 'Retry'}</span>
      </button>
    </div>
  );
};
